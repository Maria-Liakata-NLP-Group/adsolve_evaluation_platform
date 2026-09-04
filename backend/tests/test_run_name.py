"""The metric API requires a lowercase snake_case run name; titles are free text."""

from api.evaluation.naming import to_run_name


def test_lowercases_and_joins_words_with_underscores() -> None:
    assert to_run_name("Baseline comparison") == "baseline_comparison"


def test_drops_punctuation() -> None:
    assert to_run_name("Run #1: GPT-4 vs Claude") == "run_1_gpt4_vs_claude"


def test_collapses_runs_of_separators() -> None:
    assert to_run_name("spaced   out --- title") == "spaced_out_title"


def test_trims_leading_and_trailing_separators() -> None:
    assert to_run_name("  Baseline!  ") == "baseline"


def test_prefixes_titles_that_would_start_with_a_digit() -> None:
    # The API pattern is ^[a-z][a-z0-9_]*$, so a leading digit is invalid.
    assert to_run_name("2026 baseline") == "run_2026_baseline"


def test_falls_back_when_nothing_usable_remains() -> None:
    assert to_run_name("!!!") == "run"


def test_falls_back_on_an_empty_title() -> None:
    assert to_run_name("") == "run"
