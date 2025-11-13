"""Minimal TightZone package utilities."""
from __future__ import annotations
from .screener import DEFAULT_COLUMNS, Screener, fetch_scanner_data

__all__ = ["Screener", "fetch_scanner_data", "DEFAULT_COLUMNS"]

def get_summary() -> str:
    """Return a short summary describing the project."""
    return (
        "TightZone automates the detection of Volatility Contraction Pattern setups "
        "and highlights promising chart candidates."
    )


def main() -> str:
    """Provide an entry point message for running the project."""
    return f"TightZone ready: {get_summary()}"
