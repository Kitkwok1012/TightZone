"""Utilities for fetching and processing TradingView screener data."""

from __future__ import annotations

from dataclasses import dataclass, field
import json
from typing import Any, Dict, List, MutableMapping, Optional, Sequence

import requests

__all__ = ["Screener", "fetch_scanner_data", "DEFAULT_COLUMNS"]

DEFAULT_COLUMNS: Sequence[str] = (
    "name",
    "close",
    "change|1D",
    "Perf.W",
    "Perf.M",
    "Perf.Y",
    "volume",
)

_DEFAULT_FILTERS: Dict[str, MutableMapping[str, Any]] = {
    "exchange": {"left": "exchange", "operation": "equal", "right": None},
    "min_price": {"left": "close", "operation": "greater", "right": None},
    "max_price": {"left": "close", "operation": "less", "right": None},
    "min_volume": {"left": "volume", "operation": "greater", "right": None},
}


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
    limit:
        Upper bound for the number of rows returned by TradingView.
    columns:
        Optional custom list of columns to request.  When omitted a sensible
        default set is used.
    session:
        Optional :class:`requests.Session` used for HTTP requests.  Supplying a
        session allows connection re-use and simplifies testing.
    """

    market: str
    exchange: Optional[str] = None
    limit: int = 25
    columns: Sequence[str] = DEFAULT_COLUMNS
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_volume: Optional[int] = None
    session: Optional[requests.Session] = field(default=None, repr=False)
    timeout: float = 10.0

    def _payload(self) -> Dict[str, Any]:
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

        upper_bound = max(0, int(self.limit))

        return {
            "markets": [self.market],
            "symbols": {"query": {"types": []}, "tickers": []},
            "columns": list(self.columns),
            "filter": filters,
            "sort": {"sortBy": "volume", "sortOrder": "desc"},
            "options": {"lang": "en"},
            "range": [0, max(0, upper_bound - 1)],
        }

    def scan(self) -> List[Dict[str, Any]]:
        payload = self._payload()
        raw = fetch_scanner_data(self.market, payload, session=self.session, timeout=self.timeout)

        columns = raw.get("columns", list(self.columns))
        rows: List[Dict[str, Any]] = []
        for entry in raw.get("data", []):
            values = entry.get("d", [])
            row = {column: value for column, value in zip(columns, values)}
            row["symbol"] = entry.get("s")
            rows.append(row)

        return rows


def _build_url(market: str) -> str:
    market_slug = market.strip().lower().replace(" ", "")
    if not market_slug:
        raise ValueError("market must be a non-empty string")
    return f"https://scanner.tradingview.com/{market_slug}/scan"


def fetch_scanner_data(
    market: str,
    payload: MutableMapping[str, Any],
    *,
    session: Optional[requests.Session] = None,
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
    session = session or requests.Session()

    try:
        response = session.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=timeout,
        )
        response.raise_for_status()
    except requests.RequestException as exc:  # pragma: no cover - network errors are environment dependant
        raise RuntimeError(f"TradingView scanner request failed: {exc}") from exc

    try:
        data = response.json()
    except json.JSONDecodeError as exc:  # pragma: no cover - depends on remote service
        raise RuntimeError("TradingView scanner returned invalid JSON") from exc

    if isinstance(data, dict) and data.get("error"):
        raise RuntimeError(f"TradingView scanner returned an error payload: {data['error']}")

    if not isinstance(data, dict):
        raise RuntimeError("Unexpected TradingView response format")

    return data
