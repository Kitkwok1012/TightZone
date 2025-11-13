"""Default TradingView filter configuration for the VCP screener."""

from __future__ import annotations

from typing import Any, Dict, List

Filter = Dict[str, Any]

DEFAULT_FILTERS: List[Filter] = [
    # Price must be above the 200-day simple moving average.
    {"left": "close", "operation": "greater", "right": "SMA200"},
    # Price must be higher than 12 USD to avoid illiquid penny stocks.
    {"left": "close", "operation": "greater", "right": 12},
    # Require a market capitalization above $2B to focus on established names.
    {"left": "market_cap_basic", "operation": "greater", "right": 2_000_000_000},
    # Ensure sufficient liquidity using the 90 day average volume.
    {"left": "average_volume_90d_calc", "operation": "greater", "right": 900_000},
    # Positive trailing twelve month earnings per share growth.
    {"left": "earnings_per_share_diluted_growth_ttm", "operation": "greater", "right": 0},
    # Positive return on equity to highlight profitable companies.
    {"left": "return_on_equity_ttm", "operation": "greater", "right": 0},
    # P/E ratio must be available (nempty) and below 80.
    {"left": "pe_basic_excl_extra_ttm", "operation": "less", "right": 80},
    {"left": "pe_basic_excl_extra_ttm", "operation": "nempty"},
    # PEG ratio below 2 to keep growth at a reasonable price.
    {"left": "peg_ratio", "operation": "less", "right": 2},
    # One-year beta below 1 to focus on lower volatility names.
    {"left": "beta_1_year", "operation": "less", "right": 1},
]

DEFAULT_COLUMNS: List[str] = [
    "name",
    "close",
    "SMA200",
    "market_cap_basic",
    "average_volume_90d_calc",
    "beta_1_year",
    "pe_basic_excl_extra_ttm",
    "peg_ratio",
    "earnings_per_share_diluted_growth_ttm",
    "return_on_equity_ttm",
]

DEFAULT_SORT: Dict[str, Any] = {
    "sortBy": "market_cap_basic",
    "sortOrder": "desc",
}

