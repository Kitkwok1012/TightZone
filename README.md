# TightZone
This project is a Python-based tool that automates the detection of VCP (Volatility Contraction Pattern) setups in stock charts. It integrates with TradingView's stock screener to fetch candidates, applies custom logic to identify tightening price action, and visualizes the results with clear chart output. Ideal for traders looking to spot quiet breakout setups programmatically.

## Usage

Query the TradingView screener and save PNG charts (price + volume + VCP shading) for every filtered ticker:

```bash
python3 -m tightzone.cli --market america --vcp-filter --charts-dir charts --pretty
```

Each row in the JSON output includes the generated chart path (if available). The PNG files show close price, trading volume, and automatically shaded Volatility Contraction Pattern segments. Rendering requires `matplotlib`; install it with:

```bash
python3 -m pip install matplotlib
```
