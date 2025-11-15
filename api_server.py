"""Flask API server for serving VCP stock data and charts."""

from flask import Flask, jsonify, send_file
from flask_cors import CORS
from pathlib import Path
from typing import MutableMapping, Sequence
import json

from tightzone.screener import Screener
from tightzone.charting import generate_charts
from tightzone.news import fetch_recent_news

app = Flask(__name__)
CORS(app)  # Enable CORS for React app

CHARTS_DIR = Path("charts")
CACHE_FILE = Path("vcp_stocks_cache.json")


def _attach_latest_news(stocks: Sequence[MutableMapping[str, object]], *, force: bool = False) -> bool:
    """Ensure each stock has up-to-date news attached.

    Returns True when any news entries were freshly fetched.
    """
    updated = False
    for stock in stocks:
        if not isinstance(stock, MutableMapping):
            continue
        symbol = stock.get("symbol")
        if not isinstance(symbol, str) or not symbol:
            continue
        news_items = stock.get("news")
        if not force and isinstance(news_items, list) and news_items:
            continue
        try:
            stock["news"] = fetch_recent_news(symbol, limit=3, days=3)
        except Exception:
            stock["news"] = []
        updated = True
    return updated


def get_vcp_stocks(force_refresh=False):
    """Get VCP stocks data, using cache if available."""
    if not force_refresh and CACHE_FILE.exists():
        with open(CACHE_FILE) as f:
            stocks = json.load(f)
        if _attach_latest_news(stocks, force=False):
            with open(CACHE_FILE, "w") as f:
                json.dump(stocks, f, indent=2)
        return stocks

    # Fetch fresh data
    screener = Screener(market="america", apply_vcp_filter=True)
    stocks = screener.scan()

    for stock in stocks:
        symbol = stock.get("symbol")
        try:
            stock["news"] = fetch_recent_news(symbol, limit=3, days=3)
        except Exception:
            stock["news"] = []

    # Generate charts
    generate_charts(stocks, CHARTS_DIR, period="6mo", interval="1d")

    _attach_latest_news(stocks, force=True)

    # Save to cache
    with open(CACHE_FILE, "w") as f:
        json.dump(stocks, f, indent=2)

    return stocks


@app.route("/api/stocks")
def get_stocks():
    """Get all VCP stocks."""
    try:
        stocks = get_vcp_stocks()
        return jsonify(stocks)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/stocks/<symbol>/chart")
def get_chart(symbol):
    """Get chart image for a specific stock."""
    # Normalize symbol (remove exchange prefix)
    symbol_clean = symbol.split(":")[-1].replace("/", "_")
    chart_path = CHARTS_DIR / f"{symbol_clean}.png"

    if not chart_path.exists():
        return jsonify({"error": "Chart not found"}), 404

    return send_file(chart_path, mimetype="image/png")


@app.route("/api/refresh")
def refresh_data():
    """Force refresh of stock data and charts."""
    try:
        stocks = get_vcp_stocks(force_refresh=True)
        return jsonify({"message": "Data refreshed", "count": len(stocks)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/health")
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    # Ensure charts directory exists
    CHARTS_DIR.mkdir(exist_ok=True)

    print("Starting VCP Stock API Server...")
    print("API will be available at http://localhost:5000")
    print("Endpoints:")
    print("  GET /api/stocks - Get all VCP stocks")
    print("  GET /api/stocks/<symbol>/chart - Get chart for specific stock")
    print("  GET /api/refresh - Force refresh data")
    print("  GET /api/health - Health check")

    app.run(debug=True, port=5000)
