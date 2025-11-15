from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

import tightzone.charting as charting

try:  # pragma: no cover - optional dependency
    import matplotlib  # type: ignore

    _HAVE_MPL = True
except ModuleNotFoundError:  # pragma: no cover - optional dependency
    _HAVE_MPL = False


def _sample_payload():
    return {
        "chart": {
            "result": [
                {
                    "timestamp": [1700000000, 1700086400, 1700172800],
                    "indicators": {"quote": [{"close": [100.0, 101.5, 99.0], "volume": [1_000_000, 1_200_000, 900_000]}]},
                }
            ]
        }
    }


def test_parse_history_payload_extracts_prices_and_volume():
    series = charting._parse_history_payload(_sample_payload())

    assert len(series) == 3
    assert series[0].close == pytest.approx(100.0)
    assert series[1].volume == pytest.approx(1_200_000)


def test_identify_vcp_contraction_zones_finds_decreasing_ranges():
    base_date = datetime(2024, 1, 1, tzinfo=timezone.utc)
    series = []
    for idx in range(40):
        # Build progressively contracting swings
        if idx < 10:
            price = 100 + (idx % 5)
        elif idx < 20:
            price = 100 + (idx % 4)
        elif idx < 30:
            price = 100 + (idx % 3)
        else:
            price = 100 + (idx % 2)
        series.append(charting.PriceBar(base_date + timedelta(days=idx), float(price), float(idx * 1_000)))

    zones = charting._identify_vcp_contraction_zones(series, segments=4)

    assert len(zones) >= 2
    # Ensure each subsequent zone is tighter
    ranges = [high - low for (_start, _end, high, low) in zones]
    assert all(ranges[i] > ranges[i + 1] for i in range(len(ranges) - 1))


@pytest.mark.skipif(not _HAVE_MPL, reason="matplotlib not available")
def test_render_price_chart_creates_png(tmp_path):
    series = charting._parse_history_payload(_sample_payload())
    output = tmp_path / "chart.png"

    charting.render_price_chart("TEST", series, output)

    assert output.exists()
    assert output.stat().st_size > 0


def test_generate_charts_writes_files_without_matplotlib(monkeypatch, tmp_path):
    series = charting._parse_history_payload(_sample_payload())

    monkeypatch.setattr("tightzone.charting.fetch_price_history", lambda symbol, **_: series)

    written = []

    def fake_render(symbol, series, output_path):
        Path(output_path).write_text("fake chart", encoding="utf-8")
        written.append(output_path)

    monkeypatch.setattr("tightzone.charting.render_price_chart", fake_render)

    rows = [{"symbol": "NASDAQ:TEST"}]

    charting.generate_charts(rows, tmp_path, period="1mo", interval="1d")

    assert "chart" in rows[0]
    assert Path(rows[0]["chart"]).read_text(encoding="utf-8") == "fake chart"
