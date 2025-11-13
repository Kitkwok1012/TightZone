import tightzone


def test_main_returns_summary_message():
    message = tightzone.main()

    assert message.startswith("TightZone ready:")
    assert "Volatility Contraction Pattern" in message
