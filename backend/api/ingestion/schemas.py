"""Request models for the results ingestion endpoint."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field, model_validator


class DatasetSpec(BaseModel):
    """Identity and privacy classification of the evaluated dataset."""

    name: str = Field(min_length=1)
    sensitive: bool = False


class ModelSpec(BaseModel):
    """Identity of the model whose outputs were evaluated."""

    name: str = Field(min_length=1)


class MetricResult(BaseModel):
    """One metric's scores, aligned positionally with results.document_ids."""

    mean: float
    document_level: list[float]
    detail: Optional[list[dict]] = None


class ResultsSpec(BaseModel):
    """Evaluation output: per-metric means, per-document scores, optional detail."""

    document_ids: list[str] = Field(min_length=1)
    metrics: dict[str, MetricResult] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def _collect_metric_keys(cls, data: Any) -> Any:
        """Gather top-level metric ids into `metrics`.

        Raw metric-calculation output writes metric ids as siblings of
        `document_ids` rather than nesting them, so accept that shape directly.
        """
        if not isinstance(data, dict) or "metrics" in data:
            return data
        return {
            "document_ids": data.get("document_ids", []),
            "metrics": {k: v for k, v in data.items() if k != "document_ids"},
        }


class IngestRequest(BaseModel):
    """Body of POST /api/runs/ingest.

    The three data sections each mirror one file the evaluation produced and are
    stored verbatim: `inputs` is posts.json, `llm_summaries` is llm_summaries.json,
    `gold_summaries` is its reference-based equivalent. All are keyed by document id.
    """

    path_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    notes: Optional[str] = None
    dataset: DatasetSpec
    model: ModelSpec
    # Opaque JSON: conversation turns here, [indication, image, image] for radiology.
    inputs: dict[str, Any] = Field(default_factory=dict)
    llm_summaries: dict[str, str] = Field(default_factory=dict)
    gold_summaries: dict[str, str] = Field(default_factory=dict)
    results: ResultsSpec
