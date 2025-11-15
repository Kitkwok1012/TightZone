"""Utilities for fetching and processing TradingView screener data."""

from __future__ import annotations

from dataclasses import dataclass, field
import json
from typing import (
    Any,
    Dict,
    Iterable,
    List,
    Mapping,
    MutableMapping,
    Optional,
    Protocol,
    Sequence,
    runtime_checkable,
)

from urllib import request as urllib_request
from urllib.error import HTTPError, URLError

__all__ = ["Screener", "fetch_scanner_data", "DEFAULT_COLUMNS"]


_MARKET_ALIASES: Mapping[str, str] = {
    "us": "america",
    "usa": "america",
    "unitedstates": "america",
}


def _slugify_market(value: str) -> str:
    slug = value.strip().lower().replace(" ", "")
    if not slug:
        raise ValueError("market must be a non-empty string")
    return _MARKET_ALIASES.get(slug, slug)


_DEFAULT_SYMBOL_TYPES: Mapping[str, Sequence[str]] = {
    "america": ("stock",),
    "crypto": ("crypto",),
    "forex": ("forex",),
    "futures": ("futures",),
    "cfd": ("cfd",),
    "index": ("index",),
}


def _coerce_symbol_types(market: str, types: Optional[Iterable[str]]) -> List[str]:
    if types is not None:
        return [t for t in types if t]

    return list(_DEFAULT_SYMBOL_TYPES.get(_slugify_market(market), ()))

DEFAULT_COLUMNS: Sequence[str] = (
    "name",
    "close",
    "change|1D",
    "Perf.W",
    "Perf.1M",
    "Perf.Y",
    "volume",
    "SMA200",
    "market_cap_basic",
    "beta_1_year",
    "average_volume_30d_calc",
)

_DEFAULT_FILTERS: Dict[str, MutableMapping[str, Any]] = {
    "exchange": {"left": "exchange", "operation": "equal", "right": None},
    "min_price": {"left": "close", "operation": "greater", "right": None},
    "max_price": {"left": "close", "operation": "less", "right": None},
    "min_volume": {"left": "volume", "operation": "greater", "right": None},
}

_VCP_REQUIRED_COLUMNS: Sequence[str] = (
    "close",
    "SMA200",
    "market_cap_basic",
    "beta_1_year",
    "average_volume_30d_calc",
)

_VCP_MIN_PRICE = 12.0
_VCP_MIN_MARKET_CAP = 2_000_000_000
_VCP_MIN_BETA = 1.0
_VCP_MIN_PRICE_VOLUME = 900_000_000.0
_PAGE_SIZE = 200


def _ensure_columns(columns: Sequence[str], required: Sequence[str]) -> List[str]:
    requested = list(columns)
    for column in required:
        if column not in requested:
            requested.append(column)
    return requested


def _coerce_float(value: Any) -> Optional[float]:
    if isinstance(value, (int, float)):
        return float(value)
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _passes_vcp_filter(row: Mapping[str, Any]) -> bool:
    price = _coerce_float(row.get("close"))
    sma200 = _coerce_float(row.get("SMA200"))
    market_cap = _coerce_float(row.get("market_cap_basic"))
    beta = _coerce_float(row.get("beta_1_year"))
    avg_volume = _coerce_float(row.get("average_volume_30d_calc"))

    if (
        price is None
        or sma200 is None
        or market_cap is None
        or beta is None
        or avg_volume is None
    ):
        return False

    if price <= sma200:
        return False
    if price <= _VCP_MIN_PRICE:
        return False
    if market_cap <= _VCP_MIN_MARKET_CAP:
        return False
    if beta <= _VCP_MIN_BETA:
        return False
    if price * avg_volume <= _VCP_MIN_PRICE_VOLUME:
        return False
    return True


@dataclass(slots=True)
class Screener:
    """Thin wrapper around the TradingView scanner endpoint.

    Parameters
    ----------
    market:
        TradingView market slug (``america``, ``crypto``, ``forex`` …).  The
        slug is used when building the request URL and does not require the
        user to know the correct top-level endpoint.
    exchange:
        Symbol exchange to filter on (``NASDAQ``, ``NYSE``, ``AMEX`` …).
    columns:
        Optional custom list of columns to request.  When omitted a sensible
        default set is used.
    session:
        Optional object providing a ``post`` method compatible with
        :class:`requests.Session`.  Supplying a session allows connection re-use
        and simplifies testing, but a lightweight ``urllib`` fallback is used
        when omitted.
    """

    market: str
    exchange: Optional[str] = None
    columns: Sequence[str] = DEFAULT_COLUMNS
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_volume: Optional[int] = None
    session: Optional["SupportsPostJSON"] = field(default=None, repr=False)
    timeout: float = 10.0
    symbol_types: Optional[Sequence[str]] = None
    apply_vcp_filter: bool = False

    def _payload(self, start: int, end: int) -> Dict[str, Any]:
        filters: List[Dict[str, Any]] = []

        def _materialise_filter(key: str, value: Optional[Any]) -> None:
            if value is None:
                return
            template = _DEFAULT_FILTERS[key]
            filters.append({**template, "right": value})

        _materialise_filter("exchange", self.exchange)
        _materialise_filter("min_price", self.min_price)
        _materialise_filter("max_price", self.max_price)
        _materialise_filter("min_volume", self.min_volume)

        columns = list(self.columns)
        if self.apply_vcp_filter:
            columns = _ensure_columns(columns, _VCP_REQUIRED_COLUMNS)

        market_slug = _slugify_market(self.market)
        start = max(0, int(start))
        end = max(start, int(end))

        return {
            "markets": [market_slug],
            "symbols": {"query": {"types": _coerce_symbol_types(self.market, self.symbol_types)}, "tickers": []},
            "columns": columns,
            "filter": filters,
            "sort": {"sortBy": "volume", "sortOrder": "desc"},
            "options": {"lang": "en"},
            "range": [start, end],
        }

    def scan(self) -> List[Dict[str, Any]]:
        rows: List[Dict[str, Any]] = []
        columns = list(self.columns)
        start = 0
        while True:
            payload = self._payload(start, start + _PAGE_SIZE - 1)
            raw = fetch_scanner_data(self.market, payload, session=self.session, timeout=self.timeout)

            columns = raw.get("columns", columns)
            chunk: List[Dict[str, Any]] = []
            for entry in raw.get("data", []):
                values = entry.get("d", [])
                row = {column: value for column, value in zip(columns, values)}
                row["symbol"] = entry.get("s")
                chunk.append(row)

            if not chunk:
                break

            rows.extend(chunk)

            if len(chunk) < _PAGE_SIZE:
                break

            start += _PAGE_SIZE

        if self.apply_vcp_filter:
            rows = [row for row in rows if _passes_vcp_filter(row)]

        return rows


def _build_url(market: str) -> str:
    market_slug = _slugify_market(market)
    return f"https://scanner.tradingview.com/{market_slug}/scan"


@runtime_checkable
class SupportsPostJSON(Protocol):
    """Protocol describing the subset of ``requests.Session`` used by the screener."""

    def post(
        self,
        url: str,
        *,
        json: MutableMapping[str, Any],
        headers: Mapping[str, str],
        timeout: float,
    ) -> Any:
        ...


def fetch_scanner_data(
    market: str,
    payload: MutableMapping[str, Any],
    *,
    session: Optional[SupportsPostJSON] = None,
    timeout: float = 10.0,
) -> Dict[str, Any]:
    """Submit ``payload`` to the TradingView scanner API.

    The previous implementation serialised the payload to JSON manually before
    delegating to :mod:`requests`.  The helper then attempted to serialise the
    already-encoded JSON string a second time, which resulted in malformed
    requests such as ``"{\"filter\": ...}"``.  TradingView correctly rejected
    those requests with ``HTTP 400``.  By accepting a mapping and passing it to
    ``requests`` via the ``json=`` keyword argument we guarantee that the body
    is serialised exactly once.
    """

    if not isinstance(payload, MutableMapping):
        raise TypeError("payload must be a mutable mapping so it can be serialised to JSON")

    url = _build_url(market)

    if session is None:
        data = _post_via_urllib(url, payload, timeout=timeout)
    else:
        post = getattr(session, "post", None)
        if not callable(post):
            raise TypeError("session must provide a callable 'post' method")

        try:
            response = post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=timeout,
            )
        except Exception as exc:  # pragma: no cover - depends on supplied session implementation
            raise RuntimeError(f"TradingView scanner request failed: {exc}") from exc

        try:
            _ensure_response_ok(response)
        except Exception as exc:  # pragma: no cover - depends on supplied session implementation
            raise RuntimeError(f"TradingView scanner request failed: {exc}") from exc

        data = _decode_json_response(response)

    if isinstance(data, dict) and data.get("error"):
        raise RuntimeError(f"TradingView scanner returned an error payload: {data['error']}")

    if not isinstance(data, dict):
        raise RuntimeError("Unexpected TradingView response format")

    return data


def _post_via_urllib(url: str, payload: MutableMapping[str, Any], *, timeout: float) -> Dict[str, Any]:
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://www.tradingview.com",
        "Referer": "https://www.tradingview.com/",
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
    }
    request = urllib_request.Request(url, data=body, headers=headers)

    try:
        with urllib_request.urlopen(request, timeout=timeout) as response:  # pragma: no cover - network usage
            raw_body = response.read()
    except HTTPError as exc:  # pragma: no cover - depends on network interactions
        detail = b""
        if exc.fp:
            try:
                detail = exc.fp.read()
            except Exception:
                detail = b""
        message = f"TradingView scanner request failed: HTTP {exc.code} {exc.reason}"
        if detail:
            try:
                decoded = detail.decode("utf-8")
            except Exception:
                decoded = repr(detail)
            message = f"{message} ({decoded.strip()})"
        raise RuntimeError(message) from exc
    except URLError as exc:  # pragma: no cover - depends on environment
        raise RuntimeError(f"TradingView scanner request failed: {exc.reason}") from exc

    try:
        text = raw_body.decode("utf-8") if isinstance(raw_body, bytes) else str(raw_body)
        return json.loads(text) if text else {}
    except json.JSONDecodeError as exc:  # pragma: no cover - depends on remote service
        raise RuntimeError("TradingView scanner returned invalid JSON") from exc


def _ensure_response_ok(response: Any) -> None:
    raiser = getattr(response, "raise_for_status", None)
    if callable(raiser):
        raiser()
        return

    status = getattr(response, "status_code", None)
    if status is None:
        status = getattr(response, "status", None)

    if status is not None and int(status) >= 400:
        raise RuntimeError(f"HTTP {status}")


def _decode_json_response(response: Any) -> Any:
    loader = getattr(response, "json", None)
    if callable(loader):
        try:
            return loader()
        except json.JSONDecodeError as exc:  # pragma: no cover - depends on remote service
            raise RuntimeError("TradingView scanner returned invalid JSON") from exc

    text = getattr(response, "text", None)
    if text is None and hasattr(response, "read"):
        raw = response.read()
        text = raw.decode("utf-8") if isinstance(raw, bytes) else raw

    if text is None:
        raise RuntimeError("TradingView scanner returned an unreadable response")

    try:
        return json.loads(text) if text else {}
    except json.JSONDecodeError as exc:  # pragma: no cover - depends on remote service
        raise RuntimeError("TradingView scanner returned invalid JSON") from exc
