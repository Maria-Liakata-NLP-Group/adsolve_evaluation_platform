from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class DatasetRef(BaseModel):
    id: int
    name: str


class ModelRef(BaseModel):
    id: int
    name: str


class MetricRef(BaseModel):
    metric_id: str
    display_label: str


class RunSummary(BaseModel):
    id: int
    path_id: Optional[str] = None
    task_label: Optional[str] = None
    use_case_label: Optional[str] = None
    title: str
    description: Optional[str] = None
    datasets: list[DatasetRef] = []
    models: list[ModelRef] = []


class RunDetail(BaseModel):
    id: int
    path_id: Optional[str] = None
    use_case_label: Optional[str] = None
    title: str
    description: Optional[str] = None
    datasets: list[DatasetRef] = []
    models: list[ModelRef] = []
    metrics: list[MetricRef] = []


class DocumentScore(BaseModel):
    doc_id: int
    score: float


class ScoreEntry(BaseModel):
    dataset_id: int
    model_id: int
    metric_id: str
    mean_score: float
    document_scores: list[DocumentScore] = []


class DashboardResponse(BaseModel):
    run_id: int
    datasets: list[DatasetRef]
    models: list[ModelRef]
    metrics: list[MetricRef]
    scores: list[ScoreEntry]


class DocumentListItem(BaseModel):
    doc_id: int
    external_id: str
    gold_summary: Optional[str] = None


class SentenceDetail(BaseModel):
    scores: list[Optional[float]] = []
    sents: list[str] = []


class MetricScore(BaseModel):
    score: float
    sentence_detail: Optional[SentenceDetail] = None


class ModelOutput(BaseModel):
    model: str
    llm_summary: Optional[str] = None
    input: Optional[list] = None
    scores: dict[str, MetricScore] = {}


class DocumentDetail(BaseModel):
    doc_id: int
    external_id: str
    dataset: str
    gold_summary: Optional[str] = None
    outputs: list[ModelOutput] = []
