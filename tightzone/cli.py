"""Command line interface for running the VCP screener."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

from .filters import DEFAULT_COLUMNS, DEFAULT_FILTERS, DEFAULT_SORT
from .screener import VCPScreener, build_filter_payload


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the TightZone VCP screener.")
    parser.add_argument("--exchange", default="", help="Optional exchange to limit results (e.g. NASDAQ)")
    parser.add_argument("--limit", type=int, default=100, help="Number of results to request from TradingView")
    parser.add_argument(
        "--filters",
        type=Path,
        help="Path to a JSON file containing custom TradingView filter definitions",
    )
    parser.add_argument(
        "--dump-payload",
        action="store_true",
        help="Print the generated TradingView payload without running the scan",
    )
    return parser.parse_args(argv)


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv)

    filters = DEFAULT_FILTERS
    if args.filters:
        filters = json.loads(Path(args.filters).read_text(encoding="utf-8"))

    screener = VCPScreener(exchange=args.exchange, limit=args.limit, filters=filters)

    if args.dump_payload:
        payload = build_filter_payload(
            filters=filters,
            columns=DEFAULT_COLUMNS,
            sort=DEFAULT_SORT,
            limit=args.limit,
            exchange=args.exchange,
        )
        print(json.dumps(payload, indent=2))
        return 0

    results = screener.scan()
    for row in results:
        print(json.dumps(row))

    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
