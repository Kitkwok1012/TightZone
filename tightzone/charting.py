"""Utilities for retrieving price history and rendering VCP-focused charts."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Iterable, List, Mapping, MutableMapping, Optional, Sequence, Tuple
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request


@dataclass(frozen=True)
class PriceBar:
    timestamp: datetime
    close: float
    volume: float


def _normalise_symbol(symbol: str) -> str:
    if ":" in symbol:
        return symbol.split(":", 1)[1]
    return symbol


def _build_history_url(symbol: str, *, period: str, interval: str) -> str:
    ticker = urllib_parse.quote(_normalise_symbol(symbol))
    return f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval={interval}&range={period}"


def fetch_price_history(symbol: str, *, period: str = "6mo", interval: str = "1d") -> List[PriceBar]:
    url = _build_history_url(symbol, period=period, interval=interval)
    request = urllib_request.Request(
        url,
        headers={
            "User-Agent": "tightzone-chart/1.0 (+https://github.com/kitkwok/TightZone)",
            "Accept": "application/json",
        },
    )
    try:
        with urllib_request.urlopen(request, timeout=10) as response:
            raw_body = response.read()
    except urllib_error.HTTPError as exc:  # pragma: no cover - depends on network
        raise RuntimeError(f"Failed to download price history for {symbol}: HTTP {exc.code}") from exc
    except urllib_error.URLError as exc:  # pragma: no cover - depends on environment
        raise RuntimeError(f"Failed to download price history for {symbol}: {exc.reason}") from exc

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError as exc:  # pragma: no cover - remote response issues
        raise RuntimeError("Received invalid JSON from Yahoo Finance") from exc

    return _parse_history_payload(payload)


def _parse_history_payload(data: Mapping[str, object]) -> List[PriceBar]:
    chart = data.get("chart")
    if not isinstance(chart, Mapping):
        raise RuntimeError("Yahoo Finance response missing chart data")

    result = chart.get("result")
    if not isinstance(result, list) or not result:
        raise RuntimeError("Yahoo Finance response missing result data")

    entries = result[0]
    if not isinstance(entries, Mapping):
        raise RuntimeError("Yahoo Finance response malformed")

    timestamps = entries.get("timestamp")
    indicators = entries.get("indicators")
    if not isinstance(timestamps, list) or not isinstance(indicators, Mapping):
        raise RuntimeError("Yahoo Finance response missing indicators")

    quotes = indicators.get("quote")
    if not isinstance(quotes, list) or not quotes:
        raise RuntimeError("Yahoo Finance quote data missing")

    quote = quotes[0]
    if not isinstance(quote, Mapping):
        raise RuntimeError("Yahoo Finance quote data malformed")

    closes = quote.get("close")
    volumes = quote.get("volume")
    if not isinstance(closes, list):
        raise RuntimeError("Yahoo Finance close prices missing")
    if not isinstance(volumes, list):
        volumes = [0.0] * len(closes)

    series: List[PriceBar] = []
    for ts, close, volume in zip(timestamps, closes, volumes):
        if close is None:
            continue
        if not isinstance(ts, (int, float)):
            continue
        volume_value = float(volume) if isinstance(volume, (int, float)) else 0.0
        series.append(PriceBar(datetime.fromtimestamp(ts, tz=timezone.utc), float(close), volume_value))

    return series


def _identify_vcp_contraction_zones(series: Sequence[PriceBar], segments: int = 4) -> List[Tuple[int, int, float, float]]:
    """Return index ranges whose price range contracts over time."""
    count = len(series)
    if count < segments * 5:
        return []

    window = max(count // segments, 1)
    start_offset = max(count - segments * window, 0)
    windows: List[Tuple[int, int, float, float, float]] = []
    for idx in range(segments):
        start = start_offset + idx * window
        end = min(start + window, count)
        if end - start < 2:
            continue
        slice_ = series[start:end]
        highs = max(point.close for point in slice_)
        lows = min(point.close for point in slice_)
        windows.append((start, end - 1, highs, lows, highs - lows))

    contracted: List[Tuple[int, int, float, float]] = []
    previous_range: Optional[float] = None
    for start, end, high, low, price_range in windows:
        if price_range <= 0:
            continue
        if previous_range is None or price_range < previous_range:
            contracted.append((start, end, high, low))
            previous_range = price_range

    return contracted


def render_price_chart(symbol: str, series: Sequence[PriceBar], output_path: Path) -> None:
    """Render a price/volume chart highlighting VCP contraction zones."""
    if not series:
        raise ValueError("series must contain at least one data point")

    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.dates as mdates
        import matplotlib.pyplot as plt
    except ImportError as exc:  # pragma: no cover - depends on environment
        raise RuntimeError("matplotlib is required to render charts. Install it with 'pip install matplotlib'") from exc

    dates = [point.timestamp for point in series]
    closes = [point.close for point in series]
    volumes = [point.volume for point in series]

    fig, (ax_price, ax_volume) = plt.subplots(
        2,
        1,
        sharex=True,
        figsize=(10, 6),
        gridspec_kw={"height_ratios": (3, 1), "hspace": 0.05},
    )

    ax_price.plot(dates, closes, color="#2563eb", linewidth=2)
    zones = _identify_vcp_contraction_zones(series)
    for idx, (start, end, high, low) in enumerate(zones):
        color = "#f59e0b" if idx == len(zones) - 1 else "#fbbf24"
        zone_dates = dates[start : end + 1]
        ax_price.fill_between(zone_dates, low, high, color=color, alpha=0.15)
        ax_price.plot([zone_dates[0], zone_dates[-1]], [high, high], color=color, linewidth=1.0)
        ax_price.plot([zone_dates[0], zone_dates[-1]], [low, low], color=color, linewidth=1.0)

    ax_price.set_ylabel("Close ($)")
    ax_price.set_title(f"{symbol} · VCP focus", fontsize=14)
    ax_price.grid(alpha=0.2)

    ax_volume.bar(dates, volumes, color="#6b7280", width=0.8)
    ax_volume.set_ylabel("Volume")
    ax_volume.grid(alpha=0.2)

    ax_volume.xaxis.set_major_locator(mdates.AutoDateLocator(minticks=5, maxticks=8))
    ax_volume.xaxis.set_major_formatter(mdates.ConciseDateFormatter(mdates.AutoDateLocator()))
    fig.autofmt_xdate()
    fig.tight_layout()

    output_path = Path(output_path)
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)


def generate_charts(
    rows: Iterable[MutableMapping[str, object]],
    output_dir: Path,
    *,
    period: str = "6mo",
    interval: str = "1d",
) -> None:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    for row in rows:
        symbol = row.get("symbol")
        if not symbol or not isinstance(symbol, str):
            continue
        try:
            history = fetch_price_history(symbol, period=period, interval=interval)
            if not history:
                row["chart_error"] = "No price history"
                continue
            safe_name = _normalise_symbol(symbol).replace("/", "_")
            file_path = output_dir / f"{safe_name}.png"
            render_price_chart(symbol, history, file_path)
        except Exception as exc:  # pragma: no cover - depends on network/matplotlib availability
            row["chart_error"] = str(exc)
            continue

        row["chart"] = str(file_path)


__all__ = ["fetch_price_history", "render_price_chart", "generate_charts", "_parse_history_payload"]
