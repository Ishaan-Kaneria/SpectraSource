from app.generators import SPECS, build_user_prompt, generate
from app.llm.mock import MockProvider
from app.schemas import GenerationParams, OutputType


def test_every_output_type_has_a_spec():
    assert set(SPECS) == set(OutputType)


def test_prompt_wraps_source_and_params():
    p = build_user_prompt(OutputType.advisory, "SRC", GenerationParams(language="Hindi"))
    assert "<source>\nSRC\n</source>" in p
    assert "Output language: Hindi" in p


def test_mock_output_validates_against_each_schema():
    for t in OutputType:
        assert generate(MockProvider(), t, "x", GenerationParams())


def test_empty_database_url_falls_back_to_sqlite(monkeypatch):
    from app.config import Settings

    monkeypatch.setenv("DATABASE_URL", "")
    assert Settings().database_url.startswith("sqlite:///")
