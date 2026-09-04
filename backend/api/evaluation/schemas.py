"""Request and response models for the evaluation endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from ..ingestion.schemas import DatasetSpec, ModelSpec


class CalculateRequest(BaseModel):
    """Body of POST /api/evaluations.

    Identity fields mirror IngestRequest, because they are forwarded as the metric
    API's opaque `metadata` and come back as the ingest body. The three data maps
    are forwarded and never persisted by the platform.
    """

    path_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    notes: Optional[str] = None
    dataset: DatasetSpec
    model: ModelSpec
    metrics: list[str] = Field(min_length=1)
    llm_summaries: dict[str, str] = Field(min_length=1)
    gold_summaries: dict[str, str] = Field(default_factory=dict)
    # The platform's name for the metric API's `posts` — source documents.
    inputs: dict[str, list[str]] = Field(default_factory=dict)


class JobStatus(BaseModel):
    """One evaluation job as the frontend sees it."""

    job_id: str
    status: str
    title: str
    error: Optional[str] = None
    run_id: Optional[int] = None
    submitted_at: datetime
    finished_at: Optional[datetime] = None
