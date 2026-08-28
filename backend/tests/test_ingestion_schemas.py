from typing import Any

import pytest
from pydantic import ValidationError

from api.ingestion.schemas import IngestRequest, ResultsSpec


def _minimal_body(**overrides: Any) -> dict[str, Any]:
    """A valid ingest body; override single keys per test."""
    body = {
        "path_id": "example_path",
        "title": "Test run",
        "dataset": {"name": "Test dataset", "sensitive": False},
        "model": {"name": "Test model"},
        "results": {
            "document_ids": ["doc-a", "doc-b"],
            "intra_nli": {"mean": 0.5, "document_level": [0.4, 0.6]},
        },
    }
    body.update(overrides)
    return body


def test_metric_keys_are_collected_from_top_level() -> None:
    """Raw metric output lists metric ids beside document_ids, not under 'metrics'."""
    results = ResultsSpec.model_validate({
        "document_ids": ["doc-a"],
        "intra_nli": {"mean": 0.5, "document_level": [0.5]},
        "mhic": {"mean": 0.7, "document_level": [0.7]},
    })

    assert results.document_ids == ["doc-a"]
    assert sorted(results.metrics) == ["intra_nli", "mhic"]
    assert results.metrics["mhic"].mean == 0.7


def test_detail_is_optional() -> None:
    results = ResultsSpec.model_validate({
        "document_ids": ["doc-a"],
        "intra_nli": {"mean": 0.5, "document_level": [0.5]},
    })

    assert results.metrics["intra_nli"].detail is None


def test_detail_is_preserved_when_present() -> None:
    results = ResultsSpec.model_validate({
        "document_ids": ["doc-a"],
        "fc_document": {
            "mean": 0.5,
            "document_level": [0.5],
            "detail": [{"scores": [0.1], "sentences": ["a sentence"]}],
        },
    })

    assert results.metrics["fc_document"].detail == [
        {"scores": [0.1], "sentences": ["a sentence"]}
    ]


def test_data_sections_are_taken_verbatim() -> None:
    """Each section mirrors one file on disk and is stored unchanged."""
    request = IngestRequest.model_validate(_minimal_body(
        inputs={"doc-a": ["first turn", "second turn"]},
        llm_summaries={"doc-a": "generated summary"},
        gold_summaries={"doc-a": "reference summary"},
    ))

    assert request.inputs == {"doc-a": ["first turn", "second turn"]}
    assert request.llm_summaries == {"doc-a": "generated summary"}
    assert request.gold_summaries == {"doc-a": "reference summary"}


def test_inputs_accept_any_json_shape() -> None:
    """Radiology inputs are [indication, image, image]; therapy inputs are turns."""
    request = IngestRequest.model_validate(_minimal_body(
        inputs={"doc-a": ["Indication: none", "/images/frontal.png", "/images/lateral.png"]}
    ))

    assert len(request.inputs["doc-a"]) == 3


def test_data_sections_default_to_empty() -> None:
    request = IngestRequest.model_validate(_minimal_body())

    assert request.inputs == {}
    assert request.llm_summaries == {}
    assert request.gold_summaries == {}


def test_sensitive_defaults_to_false() -> None:
    request = IngestRequest.model_validate(_minimal_body(
        dataset={"name": "Test dataset"}
    ))

    assert request.dataset.sensitive is False


def test_empty_document_ids_is_rejected() -> None:
    with pytest.raises(ValidationError):
        IngestRequest.model_validate(_minimal_body(
            results={"document_ids": []}
        ))


def test_blank_title_is_rejected() -> None:
    with pytest.raises(ValidationError):
        IngestRequest.model_validate(_minimal_body(title=""))
