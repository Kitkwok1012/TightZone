import pytest

from tightzone.screener import Screener


def test_payload_slugifies_market_and_sets_default_types():
    screener = Screener(market=" America ", exchange="NYSE")

    payload = screener._payload(0, 0)

    assert payload["markets"] == ["america"]
    assert payload["symbols"]["query"]["types"] == ["stock"]


def test_market_aliases_are_supported():
    screener = Screener(market="US", exchange="NYSE")

    payload = screener._payload(0, 0)

    assert payload["markets"] == ["america"]


@pytest.mark.parametrize(
    "types, expected",
    [
        (None, ["stock"]),
        ([], []),
        (("stock", "etf"), ["stock", "etf"]),
        (("stock", ""), ["stock"]),
    ],
)
def test_symbol_types_can_be_overridden(types, expected):
    screener = Screener(market="america", symbol_types=types)

    payload = screener._payload(0, 0)

    assert payload["symbols"]["query"]["types"] == expected


def test_payload_includes_vcp_columns_when_filter_enabled():
    screener = Screener(market="america", columns=("name",), apply_vcp_filter=True)

    payload = screener._payload(0, 0)

    assert payload["columns"] == [
        "name",
        "close",
        "SMA200",
        "market_cap_basic",
        "beta_1_year",
        "average_volume_30d_calc",
    ]


def _mock_response():
    return {
        "columns": [
            "close",
            "SMA200",
            "market_cap_basic",
            "beta_1_year",
            "average_volume_30d_calc",
        ],
        "data": [
            {"s": "STRONG", "d": [50.0, 40.0, 3_500_000_000, 1.2, 30_000_000]},
            {"s": "WEAK", "d": [11.0, 15.0, 5_000_000_000, 1.5, 8_000_000]},
        ],
    }


def test_scan_filters_rows_when_vcp_filter_requested(monkeypatch):
    monkeypatch.setattr("tightzone.screener.fetch_scanner_data", lambda *args, **kwargs: _mock_response())
    screener = Screener(
        market="america",
        apply_vcp_filter=True,
        columns=(
            "close",
            "SMA200",
            "market_cap_basic",
            "beta_1_year",
            "average_volume_30d_calc",
        ),
    )

    rows = screener.scan()

    assert [row["symbol"] for row in rows] == ["STRONG"]


def test_scan_returns_all_rows_when_vcp_filter_disabled(monkeypatch):
    monkeypatch.setattr("tightzone.screener.fetch_scanner_data", lambda *args, **kwargs: _mock_response())
    screener = Screener(
        market="america",
        apply_vcp_filter=False,
        columns=(
            "close",
            "SMA200",
            "market_cap_basic",
            "beta_1_year",
            "average_volume_30d_calc",
        ),
    )

    rows = screener.scan()

    assert {row["symbol"] for row in rows} == {"STRONG", "WEAK"}


def test_scan_requests_multiple_pages(monkeypatch):
    responses = [
        {
            "columns": ["close"],
            "data": [{"s": "AAA", "d": [1.0]}, {"s": "BBB", "d": [2.0]}],
        },
        {
            "columns": ["close"],
            "data": [{"s": "CCC", "d": [3.0]}],
        },
    ]
    ranges = []

    def fake_fetch(market, payload, **kwargs):
        ranges.append(payload["range"])
        return responses.pop(0)

    monkeypatch.setattr("tightzone.screener.fetch_scanner_data", fake_fetch)
    monkeypatch.setattr("tightzone.screener._PAGE_SIZE", 2)

    screener = Screener(market="america", columns=("close",))

    rows = screener.scan()

    assert [row["symbol"] for row in rows] == ["AAA", "BBB", "CCC"]
    assert ranges == [[0, 1], [2, 3]]
