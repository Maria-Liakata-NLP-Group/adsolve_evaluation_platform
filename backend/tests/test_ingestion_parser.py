from typing import Any

import pytest

from api.ingestion.parser import IngestValidationError, normalise_detail, parse_run
from api.ingestion.schemas import IngestRequest

KNOWN_METRICS = {"intra_nli", "mhic", "fc_document"}


def _request(**overrides: Any) -> IngestRequest:
    body = {
        "path_id": "example_path",
        "title": "Test run",
        "dataset": {"name": "Test dataset"},
        "model": {"name": "Test model"},
        "results": {
            "document_ids": ["doc-a", "doc-b"],
            "intra_nli": {"mean": 0.5, "document_level": [0.4, 0.6]},
        },
    }
    body.update(overrides)
    return IngestRequest.model_validate(body)


def test_normalise_detail_renames_sentences_to_sents() -> None:
    """The dashboard reads sentDetail.sents; metric output writes 'sentences'."""
    result = normalise_detail({"scores": [0.1], "sentences": ["a sentence"]})

    assert result == {"scores": [0.1], "sents": ["a sentence"]}


def test_normalise_detail_passes_through_existing_sents() -> None:
    result = normalise_detail({"scores": [0.1], "sents": ["a sentence"]})

    assert result == {"scores": [0.1], "sents": ["a sentence"]}


def test_normalise_detail_handles_none() -> None:
    assert normalise_detail(None) is None


def test_parse_run_builds_a_document_row_per_id() -> None:
    parsed = parse_run(_request(), KNOWN_METRICS)

    assert [d.external_id for d in parsed.documents] == ["doc-a", "doc-b"]
    assert all(d.gold_summary is None for d in parsed.documents)


def test_parse_run_attaches_gold_summaries_where_supplied() -> None:
    parsed = parse_run(
        _request(gold_summaries={"doc-a": "gold text"}),
        KNOWN_METRICS,
    )

    by_id = {d.external_id: d for d in parsed.documents}
    assert by_id["doc-a"].gold_summary == "gold text"
    assert by_id["doc-b"].gold_summary is None


def test_parse_run_combines_summaries_and_inputs_into_model_outputs() -> None:
    parsed = parse_run(
        _request(
            llm_summaries={"doc-a": "summary"},
            inputs={"doc-a": ["first turn", "second turn"]},
        ),
        KNOWN_METRICS,
    )

    assert len(parsed.model_outputs) == 1
    assert parsed.model_outputs[0].external_id == "doc-a"
    assert parsed.model_outputs[0].llm_summary == "summary"
    assert parsed.model_outputs[0].input == ["first turn", "second turn"]


def test_parse_run_builds_a_model_output_when_only_a_summary_is_given() -> None:
    parsed = parse_run(_request(llm_summaries={"doc-a": "summary"}), KNOWN_METRICS)

    assert len(parsed.model_outputs) == 1
    assert parsed.model_outputs[0].llm_summary == "summary"
    assert parsed.model_outputs[0].input is None


def test_parse_run_builds_a_model_output_when_only_an_input_is_given() -> None:
    parsed = parse_run(_request(inputs={"doc-b": ["a turn"]}), KNOWN_METRICS)

    assert len(parsed.model_outputs) == 1
    assert parsed.model_outputs[0].external_id == "doc-b"
    assert parsed.model_outputs[0].llm_summary is None
    assert parsed.model_outputs[0].input == ["a turn"]


def test_parse_run_ignores_data_for_documents_not_in_results() -> None:
    """A stray id in a data file must not create an orphan row."""
    parsed = parse_run(
        _request(llm_summaries={"doc-a": "summary", "doc-unknown": "stray"}),
        KNOWN_METRICS,
    )

    assert [o.external_id for o in parsed.model_outputs] == ["doc-a"]


def test_parse_run_aligns_scores_with_document_ids() -> None:
    parsed = parse_run(_request(), KNOWN_METRICS)

    scores = parsed.metric_scores[0]
    assert scores.metric_id == "intra_nli"
    assert scores.mean_score == 0.5
    assert [(s.external_id, s.score) for s in scores.document_scores] == [
        ("doc-a", 0.4),
        ("doc-b", 0.6),
    ]


def test_parse_run_normalises_detail_per_document() -> None:
    parsed = parse_run(
        _request(results={
            "document_ids": ["doc-a", "doc-b"],
            "fc_document": {
                "mean": 0.5,
                "document_level": [0.4, 0.6],
                "detail": [
                    {"scores": [0.4], "sentences": ["first"]},
                    {"scores": [0.6], "sentences": ["second"]},
                ],
            },
        }),
        KNOWN_METRICS,
    )

    details = [s.sentence_detail for s in parsed.metric_scores[0].document_scores]
    assert details == [
        {"scores": [0.4], "sents": ["first"]},
        {"scores": [0.6], "sents": ["second"]},
    ]


def test_parse_run_rejects_unknown_metric_ids() -> None:
    with pytest.raises(IngestValidationError) as exc:
        parse_run(
            _request(results={
                "document_ids": ["doc-a"],
                "not_a_metric": {"mean": 0.5, "document_level": [0.5]},
            }),
            KNOWN_METRICS,
        )

    assert any("not_a_metric" in e for e in exc.value.errors)


def test_parse_run_rejects_misaligned_document_level() -> None:
    with pytest.raises(IngestValidationError) as exc:
        parse_run(
            _request(results={
                "document_ids": ["doc-a", "doc-b"],
                "intra_nli": {"mean": 0.5, "document_level": [0.4]},
            }),
            KNOWN_METRICS,
        )

    assert any("document_level" in e for e in exc.value.errors)


def test_parse_run_rejects_misaligned_detail() -> None:
    with pytest.raises(IngestValidationError) as exc:
        parse_run(
            _request(results={
                "document_ids": ["doc-a", "doc-b"],
                "fc_document": {
                    "mean": 0.5,
                    "document_level": [0.4, 0.6],
                    "detail": [{"scores": [0.4], "sentences": ["only one"]}],
                },
            }),
            KNOWN_METRICS,
        )

    assert any("detail" in e for e in exc.value.errors)


def test_parse_run_rejects_duplicate_document_ids() -> None:
    with pytest.raises(IngestValidationError) as exc:
        parse_run(
            _request(results={
                "document_ids": ["doc-a", "doc-a"],
                "intra_nli": {"mean": 0.5, "document_level": [0.4, 0.6]},
            }),
            KNOWN_METRICS,
        )

    assert any("Duplicate" in e for e in exc.value.errors)


def test_parse_run_reports_every_error_at_once() -> None:
    with pytest.raises(IngestValidationError) as exc:
        parse_run(
            _request(results={
                "document_ids": ["doc-a", "doc-a"],
                "not_a_metric": {"mean": 0.5, "document_level": [0.4]},
            }),
            KNOWN_METRICS,
        )

    assert len(exc.value.errors) >= 3
