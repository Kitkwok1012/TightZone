"""Command line interface for the TightZone screener."""

from __future__ import annotations

import argparse
from pathlib import Path
import json
import sys
from typing import Iterable, Optional, Sequence

from .charting import generate_charts
from .screener import DEFAULT_COLUMNS, Screener


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Query the TradingView screener")
    parser.add_argument(
        "--market",
        default="america",
        help="TradingView market slug to query (default: america)",
    )
    parser.add_argument(
        "--exchange",
        default=None,
        help="Exchange symbol to filter on (e.g. NASDAQ, NYSE)",
    )
    parser.add_argument("--min-price", type=float, default=None, help="Minimum last price filter")
    parser.add_argument("--max-price", type=float, default=None, help="Maximum last price filter")
    parser.add_argument("--min-volume", type=int, default=None, help="Minimum volume filter")
    parser.add_argument(
        "--columns",
        nargs="*",
        default=None,
        help="Optional list of TradingView column identifiers to request",
    )
    parser.add_argument(
        "--vcp-filter",
        action="store_true",
        help="Apply the default VCP screening rules (price>SMA200, price>12, market cap>2B, beta>1, price*avg volume>900M)",
    )
    parser.add_argument(
        "--charts-dir",
        default=None,
        help="Optional directory to store SVG charts for each resulting ticker",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON output instead of compact representation",
    )
    return parser


def _normalise_columns(columns: Optional[Sequence[str]]) -> Optional[Sequence[str]]:
    if not columns:
        return None
    return tuple(column for column in columns if column)


def main(argv: Optional[Iterable[str]] = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)

    screener = Screener(
        market=args.market,
        exchange=args.exchange,
        columns=_normalise_columns(args.columns) or DEFAULT_COLUMNS,
        min_price=args.min_price,
        max_price=args.max_price,
        min_volume=args.min_volume,
        apply_vcp_filter=args.vcp_filter,
    )

    try:
        results = screener.scan()
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    if args.charts_dir:
        generate_charts(results, Path(args.charts_dir))

    if args.pretty:
        json.dump(results, sys.stdout, indent=2)
    else:
        json.dump(results, sys.stdout, separators=(",", ":"))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
