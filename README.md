# TightZone

TightZone is a Python utility that re-creates the TradingView VCP screener
shown in the accompanying screenshot. It uses the [`tradingview-ta`][tradingview-ta]
library to call TradingView's stock scanner API with a pre-configured set of
fundamental and technical filters tailored to the VCP (Volatility Contraction
Pattern) setup.

## Features

- Pre-built TradingView filter payload based on the screenshot criteria:
  - U.S. stock market universe (`america` screener).
  - Price trading above the 200-day simple moving average and above USD 12.
  - Market capitalisation greater than USD 900M with a preference toward large caps.
  - Positive EPS growth and ROE, moderate P/E, low PEG ratio, and beta below 1.
- Simple CLI for fetching screener results or dumping the underlying payload for
  manual inspection in TradingView's screener UI.
- Extensible filter definitions that can be tweaked via JSON.

## Installation

```bash
pip install .
```

The installation command above will also install the `tradingview-ta` dependency.

## Usage

```bash
# Print the TradingView payload to inspect it before running the scan
python -m tightzone.cli --dump-payload

# Fetch the default VCP candidates (100 tickers by default)
python -m tightzone.cli

# Limit results to the NASDAQ exchange and request only 25 tickers
python -m tightzone.cli --exchange NASDAQ --limit 25

# Supply a custom JSON filter definition
python -m tightzone.cli --filters my_filters.json
```

Every command prints JSON lines with the symbol and requested columns returned
by TradingView.

## Custom filters

The default filter configuration lives in `tightzone/filters.py`. To experiment
with different criteria, copy the `DEFAULT_FILTERS` list into a separate JSON
file and pass it to the CLI via the `--filters` option. The payload format is
identical to TradingView's screener API and can be pasted directly into the
browser developer tools when debugging.

[tradingview-ta]: https://pypi.org/project/tradingview-ta/
