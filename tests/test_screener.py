import pytest

from tightzone.screener import Screener


def test_payload_slugifies_market_and_sets_default_types():
    screener = Screener(market=" America ", exchange="NYSE", limit=10)

    payload = screener._payload()

    assert payload["markets"] == ["america"]
    assert payload["symbols"]["query"]["types"] == ["stock"]


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

    payload = screener._payload()

    assert payload["symbols"]["query"]["types"] == expected
