"""Validates an ingest request and flattens it into database-ready rows."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Any, Optional

from .schemas import IngestRequest


class IngestValidationError(Exception):
    """Cross-field validation failures, collected so all are reported at once."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__("; ".join(errors))
        self.errors = errors


@dataclass
class DocumentRow:
    external_id: str
    gold_summary: Optional[str]


@dataclass
class ModelOutputRow:
    external_id: str
    llm_summary: Optional[str]
    input: Any


@dataclass
class DocumentScoreRow:
    external_id: str
    score: float
    sentence_detail: Optional[dict]


@dataclass
class MetricScoreRow:
    metric_id: str
    mean_score: float
    document_scores: list[DocumentScoreRow]


@dataclass
class ParsedRun:
    documents: list[DocumentRow]
    model_outputs: list[ModelOutputRow]
    metric_scores: list[MetricScoreRow]


def normalise_detail(detail: Optional[dict]) -> Optional[dict]:
    """Rename the 'sentences' key to 'sents', which is what the dashboard reads."""
    if not detail:
        return None
    normalised = dict(detail)
    if "sentences" in normalised:
        normalised["sents"] = normalised.pop("sentences")
    return normalised


def _collect_errors(request: IngestRequest, known_metric_ids: set[str]) -> list[str]:
    """Check every cross-field constraint, returning all violations."""
    document_ids = request.results.document_ids
    errors: list[str] = []

    duplicates = sorted(id_ for id_, n in Counter(document_ids).items() if n > 1)
    if duplicates:
        errors.append(f"Duplicate document ids: {', '.join(duplicates)}")

    unknown = sorted(set(request.results.metrics) - known_metric_ids)
    if unknown:
        errors.append(f"Unknown metric ids: {', '.join(unknown)}")

    expected = len(document_ids)
    for metric_id, result in request.results.metrics.items():
        if len(result.document_level) != expected:
            errors.append(
                f"Metric '{metric_id}': document_level has "
                f"{len(result.document_level)} scores but there are "
                f"{expected} document ids"
            )
        if result.detail is not None and len(result.detail) != expected:
            errors.append(
                f"Metric '{metric_id}': detail has {len(result.detail)} entries "
                f"but there are {expected} document ids"
            )

    return errors


def parse_run(request: IngestRequest, known_metric_ids: set[str]) -> ParsedRun:
    """Validate the request and flatten it into rows ready for the writer.

    Raises IngestValidationError listing every constraint the request violates.
    """
    errors = _collect_errors(request, known_metric_ids)
    if errors:
        raise IngestValidationError(errors)

    document_ids = request.results.document_ids

    documents = [
        DocumentRow(
            external_id=doc_id,
            gold_summary=request.gold_summaries.get(doc_id),
        )
        for doc_id in document_ids
    ]

    # A model output row is warranted when either half is present. Ids appearing
    # only in a data file (not in results.document_ids) are ignored — a row for
    # them would have no scores to hang off.
    model_outputs = [
        ModelOutputRow(
            external_id=doc_id,
            llm_summary=request.llm_summaries.get(doc_id),
            input=request.inputs.get(doc_id),
        )
        for doc_id in document_ids
        if doc_id in request.llm_summaries or doc_id in request.inputs
    ]

    metric_scores = [
        MetricScoreRow(
            metric_id=metric_id,
            mean_score=result.mean,
            document_scores=[
                DocumentScoreRow(
                    external_id=doc_id,
                    score=result.document_level[index],
                    sentence_detail=(
                        normalise_detail(result.detail[index])
                        if result.detail is not None
                        else None
                    ),
                )
                for index, doc_id in enumerate(document_ids)
            ],
        )
        for metric_id, result in request.results.metrics.items()
    ]

    return ParsedRun(
        documents=documents,
        model_outputs=model_outputs,
        metric_scores=metric_scores,
    )
