# TightZone
This project is a Python-based tool that automates the detection of VCP (Volatility Contraction Pattern) setups in stock charts. It integrates with TradingView's stock screener to fetch candidates, applies custom logic to identify tightening price action, and visualizes the results with clear chart output. Ideal for traders looking to spot quiet breakout setups programmatically.

## Quick Start - Web Viewer

The fastest way to get started is using the web interface. Works on **macOS, Linux, and Windows**:

```bash
node start.js
```

Or on Unix-based systems (macOS/Linux):
```bash
./start.js
```

This will:
- Automatically detect your operating system
- Kill any existing processes on ports 3000 and 5001
- Start the backend API server (port 5001)
- Start the React frontend (port 3000)
- Automatically open the app in your browser

The web viewer provides:
- Interactive stock charts with VCP patterns
- Real-time data refresh
- Sortable and filterable stock lists
- Performance metrics and indicators

### Manual Startup

If you prefer to start servers separately:

**Terminal 1 - Backend API Server:**
```bash
node server.js
```

**Terminal 2 - React Frontend:**
```bash
cd web/vcp-viewer
npm start
```

### Stopping the Application

- If using `start.js`: Press `Ctrl+C` to stop both servers
- If running manually: Press `Ctrl+C` in each terminal

## CLI Usage

Query the TradingView screener and save PNG charts (price + volume + VCP shading) for every filtered ticker:

```bash
python3 -m tightzone.cli --market america --vcp-filter --charts-dir charts --pretty
```

Each row in the JSON output includes the generated chart path (if available). The PNG files show close price, trading volume, and automatically shaded Volatility Contraction Pattern segments. Rendering requires `matplotlib`; install it with:

```bash
python3 -m pip install matplotlib
```
