from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class UseCaseSchema(BaseModel):
    id: str
    label: str
    description: Optional[str] = None


class PathSummary(BaseModel):
    id: str
    use_case_id: str
    task_id: str
    data_source_id: str
    data_source_label: str
    use_case_label: str
    task_label: str


class InfraOption(BaseModel):
    id: str
    label: str


class InfraGroup(BaseModel):
    label: str
    options: list[InfraOption]


class InfrastructureSchema(BaseModel):
    compute_environment: InfraGroup
    reference_mode: InfraGroup


class MetricSchema(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    tags: list[str] = []
    supported_compute_environments: list[str] = []
    supported_reference_modes: list[str] = []


class PathAspect(BaseModel):
    id: str
    label: str
    definition: Optional[str] = None
    sort_order: int = 0
    examples: Optional[Any] = None
    stakeholder_requirements: Optional[Any] = None
    metrics: list[MetricSchema] = []


class PathDetail(BaseModel):
    id: str
    use_case_id: str
    task_id: str
    data_source_id: str
    data_source_label: str
    data_source_description: Optional[str] = None
    aspects: list[PathAspect] = []
