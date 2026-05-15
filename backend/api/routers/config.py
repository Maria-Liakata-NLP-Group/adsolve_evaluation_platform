from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas.config import (
    InfraGroup,
    InfraOption,
    InfrastructureSchema,
    MetricSchema,
    PathAspect,
    PathDetail,
    PathSummary,
    UseCaseSchema,
)

router = APIRouter(prefix="/api")

# Infrastructure options are hardcoded because their labels are not stored in
# the database — they originated from a YAML file that is no longer part of
# the frontend bundle.
_INFRASTRUCTURE = InfrastructureSchema(
    compute_environment=InfraGroup(
        label="Compute environment",
        options=[
            InfraOption(id="cpu_only", label="CPU only (no GPU)"),
            InfraOption(id="gpu_available", label="GPU available"),
            InfraOption(id="cloud_inference", label="Cloud Inference"),
        ],
    ),
    reference_mode=InfraGroup(
        label="References",
        options=[
            InfraOption(id="reference_free", label="Reference free"),
            InfraOption(id="reference_based", label="Reference based"),
        ],
    ),
)


@router.get("/use-cases", response_model=list[UseCaseSchema])
def get_use_cases(db: Session = Depends(get_db)) -> list[UseCaseSchema]:
    """Return all use cases ordered by id."""
    rows = db.execute(
        text("SELECT id, label, description FROM use_cases ORDER BY id")
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/paths", response_model=list[PathSummary])
def get_paths(
    use_case_id: Optional[str] = None,
    db: Session = Depends(get_db),
) -> list[PathSummary]:
    """Return all evaluation paths, optionally filtered by use_case_id."""
    sql = """
        SELECT p.id, p.use_case_id, p.task_id, p.data_source_id, p.data_source_label,
               uc.label AS use_case_label, t.label AS task_label
        FROM   paths p
        JOIN   use_cases uc ON uc.id = p.use_case_id
        JOIN   tasks t      ON t.id  = p.task_id
        WHERE  (CAST(:use_case_id AS TEXT) IS NULL OR p.use_case_id = :use_case_id)
        ORDER  BY p.id
    """
    rows = db.execute(text(sql), {"use_case_id": use_case_id}).mappings().all()
    return [dict(r) for r in rows]


@router.get("/paths/{path_id}", response_model=PathDetail)
def get_path(path_id: str, db: Session = Depends(get_db)) -> PathDetail:
    """Return full detail for a single evaluation path including aspects and metrics."""
    path_row = db.execute(
        text("""
            SELECT p.id, p.use_case_id, p.task_id, p.data_source_id,
                   p.data_source_label, p.data_source_description
            FROM   paths p
            WHERE  p.id = :path_id
        """),
        {"path_id": path_id},
    ).mappings().one_or_none()

    if path_row is None:
        raise HTTPException(status_code=404, detail="Path not found")

    aspect_rows = db.execute(
        text("""
            SELECT pa.id AS path_aspect_id, a.id AS aspect_id, a.label,
                   pa.definition, pa.sort_order, pa.examples, pa.stakeholder_requirements
            FROM   path_aspects pa
            JOIN   aspects a ON a.id = pa.aspect_id
            WHERE  pa.path_id = :path_id
            ORDER  BY pa.sort_order
        """),
        {"path_id": path_id},
    ).mappings().all()

    metric_rows = db.execute(
        text("""
            SELECT pam.path_aspect_id, m.id, m.label, m.description, m.tags,
                   m.supported_compute_environments, m.supported_reference_modes
            FROM   path_aspect_metrics pam
            JOIN   metrics m ON m.id = pam.metric_id
            WHERE  pam.path_aspect_id IN (
                SELECT id FROM path_aspects WHERE path_id = :path_id
            )
            ORDER  BY pam.path_aspect_id, m.id
        """),
        {"path_id": path_id},
    ).mappings().all()

    # Group metrics by their parent path_aspect_id.
    metrics_by_aspect: dict[int, list[MetricSchema]] = {}
    for mr in metric_rows:
        pa_id = mr["path_aspect_id"]
        metrics_by_aspect.setdefault(pa_id, []).append(
            MetricSchema(
                id=mr["id"],
                label=mr["label"],
                description=mr["description"],
                tags=list(mr["tags"] or []),
                supported_compute_environments=list(mr["supported_compute_environments"] or []),
                supported_reference_modes=list(mr["supported_reference_modes"] or []),
            )
        )

    aspects = [
        PathAspect(
            id=ar["aspect_id"],
            label=ar["label"],
            definition=ar["definition"],
            sort_order=ar["sort_order"],
            examples=ar["examples"],
            stakeholder_requirements=ar["stakeholder_requirements"],
            metrics=metrics_by_aspect.get(ar["path_aspect_id"], []),
        )
        for ar in aspect_rows
    ]

    return PathDetail(
        id=path_row["id"],
        use_case_id=path_row["use_case_id"],
        task_id=path_row["task_id"],
        data_source_id=path_row["data_source_id"],
        data_source_label=path_row["data_source_label"],
        data_source_description=path_row["data_source_description"],
        aspects=aspects,
    )


@router.get("/infrastructure", response_model=InfrastructureSchema)
def get_infrastructure() -> InfrastructureSchema:
    """Return the hardcoded infrastructure options (compute environment and reference mode)."""
    return _INFRASTRUCTURE
