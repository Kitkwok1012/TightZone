"""TradingView screener utilities for VCP candidates."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Sequence

from tradingview_ta import get_scanner_data

from .filters import DEFAULT_COLUMNS, DEFAULT_FILTERS, DEFAULT_SORT, Filter


@dataclass
class VCPScreener:
    """Wrapper around :mod:`tradingview_ta` screener API for VCP scans."""

    market: str = "america"
    instrument: str = "stocks"
    exchange: str = ""
    filters: Sequence[Filter] = field(default_factory=lambda: tuple(DEFAULT_FILTERS))
    columns: Sequence[str] = field(default_factory=lambda: tuple(DEFAULT_COLUMNS))
    sort: Dict[str, Any] = field(default_factory=lambda: dict(DEFAULT_SORT))
    limit: int = 50

    def scan(self) -> List[Dict[str, Any]]:
        """Fetch screener results from TradingView.

        Returns a list of dictionaries containing column names and values
        for every symbol that matched the configured filters.
        """

        payload = build_filter_payload(
            filters=self.filters,
            columns=self.columns,
            sort=self.sort,
            limit=self.limit,
            exchange=self.exchange,
        )
        raw = get_scanner_data(self.market, self.instrument, json.dumps(payload))
        return parse_results(raw)


def build_filter_payload(
    *,
    filters: Iterable[Filter],
    columns: Iterable[str],
    sort: Dict[str, Any],
    limit: int,
    exchange: str = "",
) -> Dict[str, Any]:
    """Construct a TradingView scanner payload.

    Parameters
    ----------
    filters:
        The set of filters to apply. Each filter must conform to TradingView's
        scanner schema.
    columns:
        Columns to request in the response.
    sort:
        Sorting dictionary describing the `sortBy` column and order.
    limit:
        Maximum number of rows to request from TradingView.
    exchange:
        Optional exchange string (e.g. ``"NYSE"``). When provided, it is passed
        as a symbol query filter in the payload.
    """

    filter_list = list(filters)
    column_list = list(columns)
    payload: Dict[str, Any] = {
        "filter": filter_list,
        "options": {"lang": "en"},
        "symbols": {
            "query": {"types": []},
            "tickers": [],
        },
        "columns": column_list,
        "sort": dict(sort),
        "range": [0, max(limit, 0)],
    }

    if exchange:
        payload["symbols"]["query"]["types"] = [f"stock|{exchange.upper()}"]

    return payload


def parse_results(raw_response: Any) -> List[Dict[str, Any]]:
    """Transform raw TradingView response into a friendly structure."""

    if not raw_response:
        return []

    if isinstance(raw_response, str):
        raw_response = json.loads(raw_response)

    data = raw_response.get("data", [])
    columns = raw_response.get("columns", [])
    parsed: List[Dict[str, Any]] = []

    for item in data:
        symbol = item.get("s")
        values = item.get("d", [])
        row = {"symbol": symbol}
        row.update({col: values[idx] if idx < len(values) else None for idx, col in enumerate(columns)})
        parsed.append(row)

    return parsed


__all__ = ["VCPScreener", "build_filter_payload", "parse_results"]
