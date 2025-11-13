import pathlib


def test_readme_contains_project_description():
    readme_path = pathlib.Path(__file__).resolve().parents[1] / "README.md"
    content = readme_path.read_text(encoding="utf-8")

    assert "TightZone" in content
    assert "Volatility Contraction Pattern" in content
