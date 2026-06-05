from __future__ import annotations

import hmac
import json
import os
import re
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas.config import (
    AspectDetail,
    AspectPathRecord,
    AspectSummary,
    AspectWrite,
    ExamplesWrite,
    InfraGroup,
    InfraOption,
    InfrastructureSchema,
    MetricDetail,
    MetricSchema,
    MetricSummary,
    MetricWrite,
    PathAspect,
    PathAspectCreate,
    PathAspectWrite,
    PathCreate,
    PathDetail,
    PathSummary,
    PathWrite,
    TaskSummary,
    UseCaseSchema,
)

router = APIRouter(prefix="/api")


def require_admin(x_admin_token: str = Header(...)) -> None:
    """FastAPI dependency: reject requests that don't carry the admin token."""
    expected = os.environ.get("ADMIN_TOKEN", "")
    if not expected:
        raise HTTPException(status_code=503, detail="Admin auth not configured on server.")
    if not hmac.compare_digest(x_admin_token, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


def _to_slug(label: str) -> str:
    """Derive a URL-safe ID from a text label."""
    return re.sub(r"[^a-z0-9_]", "", label.lower().replace(" ", "_"))


@router.get("/admin/verify")
def verify_admin(_: None = Depends(require_admin)) -> dict:
    """Lightweight endpoint to validate an admin token from the frontend."""
    return {"status": "ok"}


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


@router.get("/tasks", response_model=list[TaskSummary])
def get_tasks(db: Session = Depends(get_db)) -> list[TaskSummary]:
    """Return all tasks ordered by label."""
    rows = db.execute(
        text("SELECT id, label FROM tasks ORDER BY label")
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
                   p.data_source_label, p.data_source_description, p.task_description,
                   uc.label AS use_case_label, t.label AS task_label
            FROM   paths p
            JOIN   use_cases uc ON uc.id = p.use_case_id
            JOIN   tasks t      ON t.id  = p.task_id
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

    run_metric_rows = db.execute(
        text("""
            SELECT DISTINCT rm.metric_id
            FROM run_metrics rm
            JOIN evaluation_runs er ON er.id = rm.run_id
            WHERE er.path_id = :path_id
        """),
        {"path_id": path_id},
    ).mappings().all()
    run_metric_ids = [r["metric_id"] for r in run_metric_rows]

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
        use_case_label=path_row["use_case_label"],
        task_id=path_row["task_id"],
        task_label=path_row["task_label"],
        task_description=path_row["task_description"],
        data_source_id=path_row["data_source_id"],
        data_source_label=path_row["data_source_label"],
        data_source_description=path_row["data_source_description"],
        aspects=aspects,
        run_metric_ids=run_metric_ids,
    )


@router.post("/paths", response_model=PathDetail, status_code=201,
             dependencies=[Depends(require_admin)])
def create_path(body: PathCreate, db: Session = Depends(get_db)) -> PathDetail:
    """Create a new evaluation path. Creates a new task row if task_label is provided."""
    if not body.task_id and not body.task_label:
        raise HTTPException(status_code=422, detail="Either task_id or task_label must be provided.")

    path_id = _to_slug(body.data_source_label)
    if not path_id:
        raise HTTPException(status_code=422, detail="data_source_label must produce a non-empty slug.")

    existing = db.execute(
        text("SELECT id FROM paths WHERE id = :id"), {"id": path_id}
    ).one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="A path with this id already exists.")

    task_id = body.task_id
    if not task_id:
        task_id = _to_slug(body.task_label)
        task_exists = db.execute(
            text("SELECT id FROM tasks WHERE id = :id"), {"id": task_id}
        ).one_or_none()
        if not task_exists:
            db.execute(
                text("INSERT INTO tasks (id, label) VALUES (:id, :label)"),
                {"id": task_id, "label": body.task_label},
            )

    try:
        db.execute(
            text("""
                INSERT INTO paths (id, use_case_id, task_id, data_source_id,
                                   data_source_label, data_source_description, task_description)
                VALUES (:id, :use_case_id, :task_id, :data_source_id,
                        :data_source_label, :data_source_description, :task_description)
            """),
            {
                "id": path_id,
                "use_case_id": body.use_case_id,
                "task_id": task_id,
                "data_source_id": path_id,
                "data_source_label": body.data_source_label,
                "data_source_description": body.data_source_description,
                "task_description": body.task_description,
            },
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=422, detail="Invalid use_case_id or task_id reference.")
    return get_path(path_id, db)


@router.put("/paths/{path_id}", response_model=PathDetail,
            dependencies=[Depends(require_admin)])
def update_path(
    path_id: str, body: PathWrite, db: Session = Depends(get_db)
) -> PathDetail:
    """Update a path's data_source_label, task_description, and data_source_description."""
    existing = db.execute(
        text("SELECT id FROM paths WHERE id = :id"), {"id": path_id}
    ).one_or_none()
    if existing is None:
        raise HTTPException(status_code=404, detail="Path not found")

    db.execute(
        text("""
            UPDATE paths
               SET data_source_label       = :data_source_label,
                   data_source_description = :data_source_description,
                   task_description        = :task_description
             WHERE id = :id
        """),
        {
            "id": path_id,
            "data_source_label": body.data_source_label,
            "data_source_description": body.data_source_description,
            "task_description": body.task_description,
        },
    )
    db.commit()
    return get_path(path_id, db)


@router.delete("/paths/{path_id}", status_code=204,
               dependencies=[Depends(require_admin)])
def delete_path(path_id: str, db: Session = Depends(get_db)) -> None:
    """Delete a path. Returns 409 if it has any evaluation runs."""
    existing = db.execute(
        text("SELECT id FROM paths WHERE id = :id"), {"id": path_id}
    ).one_or_none()
    if existing is None:
        raise HTTPException(status_code=404, detail="Path not found")

    blocking = db.execute(
        text("SELECT id FROM evaluation_runs WHERE path_id = :path_id"),
        {"path_id": path_id},
    ).mappings().all()

    if blocking:
        run_ids = [r["id"] for r in blocking]
        raise HTTPException(
            status_code=409,
            detail={
                "message": f"Path has {len(run_ids)} run(s).",
                "blocking_run_ids": run_ids,
            },
        )

    db.execute(text("DELETE FROM paths WHERE id = :id"), {"id": path_id})
    db.commit()


@router.post("/paths/{path_id}/aspects", response_model=PathDetail, status_code=201,
             dependencies=[Depends(require_admin)])
def add_aspect_to_path(
    path_id: str, body: PathAspectCreate, db: Session = Depends(get_db)
) -> PathDetail:
    """Add an aspect to a path with optional initial configuration."""
    if db.execute(text("SELECT id FROM paths WHERE id = :id"), {"id": path_id}).one_or_none() is None:
        raise HTTPException(status_code=404, detail="Path not found")
    if db.execute(text("SELECT id FROM aspects WHERE id = :id"), {"id": body.aspect_id}).one_or_none() is None:
        raise HTTPException(status_code=404, detail="Aspect not found")

    existing_link = db.execute(
        text("SELECT id FROM path_aspects WHERE path_id = :path_id AND aspect_id = :aspect_id"),
        {"path_id": path_id, "aspect_id": body.aspect_id},
    ).one_or_none()
    if existing_link:
        raise HTTPException(status_code=409, detail="Aspect is already linked to this path.")

    max_order = db.execute(
        text("SELECT COALESCE(MAX(sort_order), -1) FROM path_aspects WHERE path_id = :path_id"),
        {"path_id": path_id},
    ).scalar_one()

    pa_id = db.execute(
        text("""
            INSERT INTO path_aspects
                (path_id, aspect_id, definition, sort_order, examples, stakeholder_requirements)
            VALUES (:path_id, :aspect_id, :definition, :sort_order,
                    CAST(:examples AS jsonb), CAST(:stakeholder_requirements AS jsonb))
            RETURNING id
        """),
        {
            "path_id": path_id,
            "aspect_id": body.aspect_id,
            "definition": body.definition or "",
            "sort_order": max_order + 1,
            "examples": json.dumps(body.examples.model_dump()) if body.examples else None,
            "stakeholder_requirements": (
                json.dumps(body.stakeholder_requirements.model_dump())
                if body.stakeholder_requirements else None
            ),
        },
    ).scalar_one()

    try:
        for metric_id in body.metric_ids:
            db.execute(
                text("INSERT INTO path_aspect_metrics (path_aspect_id, metric_id) VALUES (:pa_id, :mid) ON CONFLICT DO NOTHING"),
                {"pa_id": pa_id, "mid": metric_id},
            )
            db.execute(
                text("INSERT INTO aspect_metrics (aspect_id, metric_id) VALUES (:aid, :mid) ON CONFLICT DO NOTHING"),
                {"aid": body.aspect_id, "mid": metric_id},
            )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=422, detail="One or more metric_ids do not exist.")

    return get_path(path_id, db)


@router.put("/paths/{path_id}/aspects/{aspect_id}", response_model=PathDetail,
            dependencies=[Depends(require_admin)])
def update_path_aspect(
    path_id: str, aspect_id: str, body: PathAspectWrite, db: Session = Depends(get_db)
) -> PathDetail:
    """Update a path-aspect's definition, examples, requirements, and metrics."""
    pa_id = db.execute(
        text("SELECT id FROM path_aspects WHERE path_id = :path_id AND aspect_id = :aspect_id"),
        {"path_id": path_id, "aspect_id": aspect_id},
    ).scalar_one_or_none()
    if pa_id is None:
        raise HTTPException(status_code=404, detail="Path aspect not found")

    # Guard: check for run-blocked metric removals before making changes.
    current_ids = {
        r["metric_id"]
        for r in db.execute(
            text("SELECT metric_id FROM path_aspect_metrics WHERE path_aspect_id = :pa_id"),
            {"pa_id": pa_id},
        ).mappings().all()
    }
    removing_ids = current_ids - set(body.metric_ids)

    if removing_ids:
        run_blocked = db.execute(
            text("""
                SELECT DISTINCT rm.metric_id
                FROM run_metrics rm
                JOIN evaluation_runs er ON er.id = rm.run_id
                WHERE er.path_id = :path_id
                  AND rm.metric_id = ANY(:removing_ids)
            """),
            {"path_id": path_id, "removing_ids": list(removing_ids)},
        ).mappings().all()

        if run_blocked:
            blocked = [r["metric_id"] for r in run_blocked]
            raise HTTPException(
                status_code=409,
                detail={
                    "message": f"Cannot remove {len(blocked)} metric(s) used in runs.",
                    "blocked_metric_ids": blocked,
                },
            )

    db.execute(
        text("""
            UPDATE path_aspects
               SET definition               = :definition,
                   examples                 = CAST(:examples AS jsonb),
                   stakeholder_requirements = CAST(:stakeholder_requirements AS jsonb)
             WHERE id = :pa_id
        """),
        {
            "pa_id": pa_id,
            "definition": body.definition or "",
            "examples": json.dumps(body.examples.model_dump()) if body.examples else None,
            "stakeholder_requirements": (
                json.dumps(body.stakeholder_requirements.model_dump())
                if body.stakeholder_requirements else None
            ),
        },
    )

    db.execute(
        text("DELETE FROM path_aspect_metrics WHERE path_aspect_id = :pa_id"),
        {"pa_id": pa_id},
    )

    try:
        for metric_id in body.metric_ids:
            db.execute(
                text("INSERT INTO path_aspect_metrics (path_aspect_id, metric_id) VALUES (:pa_id, :mid) ON CONFLICT DO NOTHING"),
                {"pa_id": pa_id, "mid": metric_id},
            )
            db.execute(
                text("INSERT INTO aspect_metrics (aspect_id, metric_id) VALUES (:aid, :mid) ON CONFLICT DO NOTHING"),
                {"aid": aspect_id, "mid": metric_id},
            )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=422, detail="One or more metric_ids do not exist.")

    return get_path(path_id, db)


@router.delete("/paths/{path_id}/aspects/{aspect_id}", status_code=204,
               dependencies=[Depends(require_admin)])
def remove_aspect_from_path(
    path_id: str, aspect_id: str, db: Session = Depends(get_db)
) -> None:
    """Remove an aspect from a path. Returns 409 if any of its metrics are used in runs."""
    pa_id = db.execute(
        text("SELECT id FROM path_aspects WHERE path_id = :path_id AND aspect_id = :aspect_id"),
        {"path_id": path_id, "aspect_id": aspect_id},
    ).scalar_one_or_none()
    if pa_id is None:
        raise HTTPException(status_code=404, detail="Path aspect not found")

    blocking = db.execute(
        text("""
            SELECT DISTINCT pam.metric_id
            FROM path_aspect_metrics pam
            JOIN evaluation_runs er ON er.path_id = :path_id
            JOIN run_metrics rm ON rm.run_id = er.id AND rm.metric_id = pam.metric_id
            WHERE pam.path_aspect_id = :pa_id
        """),
        {"path_id": path_id, "pa_id": pa_id},
    ).mappings().all()

    if blocking:
        blocked_ids = [r["metric_id"] for r in blocking]
        raise HTTPException(
            status_code=409,
            detail={
                "message": f"Cannot remove aspect — {len(blocked_ids)} metric(s) used in runs.",
                "blocked_metric_ids": blocked_ids,
            },
        )

    db.execute(text("DELETE FROM path_aspects WHERE id = :pa_id"), {"pa_id": pa_id})
    db.commit()


@router.get("/aspects", response_model=list[AspectSummary])
def get_aspects(db: Session = Depends(get_db)) -> list[AspectSummary]:
    """Return all aspects ordered by label."""
    rows = db.execute(
        text("SELECT id, label FROM aspects ORDER BY label")
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/aspects/{aspect_id}", response_model=AspectDetail)
def get_aspect(aspect_id: str, db: Session = Depends(get_db)) -> AspectDetail:
    """Return an aspect with its distinct associated metrics across all paths."""
    aspect_row = db.execute(
        text("SELECT id, label, description FROM aspects WHERE id = :id"),
        {"id": aspect_id},
    ).mappings().one_or_none()

    if aspect_row is None:
        raise HTTPException(status_code=404, detail="Aspect not found")

    metric_rows = db.execute(
        text("""
            SELECT m.id, m.label
            FROM metrics m
            JOIN aspect_metrics am ON am.metric_id = m.id
            WHERE am.aspect_id = :aspect_id
            ORDER BY m.label
        """),
        {"aspect_id": aspect_id},
    ).mappings().all()

    return AspectDetail(
        id=aspect_row["id"],
        label=aspect_row["label"],
        description=aspect_row["description"],
        metrics=[MetricSummary(id=r["id"], label=r["label"]) for r in metric_rows],
    )


@router.get("/aspects/{aspect_id}/paths", response_model=list[AspectPathRecord])
def get_aspect_paths(aspect_id: str, db: Session = Depends(get_db)) -> list[AspectPathRecord]:
    """Return all paths that include the given aspect, with per-path definition and metrics."""
    path_rows = db.execute(
        text("""
            SELECT pa.id AS path_aspect_id, p.id AS path_id,
                   uc.label AS use_case_label, t.label AS task_label,
                   p.data_source_label, pa.definition, pa.examples, pa.stakeholder_requirements
            FROM   path_aspects pa
            JOIN   paths p      ON p.id  = pa.path_id
            JOIN   use_cases uc ON uc.id = p.use_case_id
            JOIN   tasks t      ON t.id  = p.task_id
            WHERE  pa.aspect_id = :aspect_id
            ORDER  BY p.id
        """),
        {"aspect_id": aspect_id},
    ).mappings().all()

    if not path_rows:
        return []

    path_aspect_ids = [r["path_aspect_id"] for r in path_rows]
    metric_rows = db.execute(
        text("""
            SELECT pam.path_aspect_id, m.id, m.label, m.description, m.tags,
                   m.supported_compute_environments, m.supported_reference_modes
            FROM   path_aspect_metrics pam
            JOIN   metrics m ON m.id = pam.metric_id
            WHERE  pam.path_aspect_id = ANY(:ids)
            ORDER  BY pam.path_aspect_id, m.id
        """),
        {"ids": path_aspect_ids},
    ).mappings().all()

    metrics_by_pa: dict[int, list[MetricSchema]] = {}
    for mr in metric_rows:
        metrics_by_pa.setdefault(mr["path_aspect_id"], []).append(
            MetricSchema(
                id=mr["id"],
                label=mr["label"],
                description=mr["description"],
                tags=list(mr["tags"] or []),
                supported_compute_environments=list(mr["supported_compute_environments"] or []),
                supported_reference_modes=list(mr["supported_reference_modes"] or []),
            )
        )

    return [
        AspectPathRecord(
            path_id=r["path_id"],
            use_case_label=r["use_case_label"],
            task_label=r["task_label"],
            data_source_label=r["data_source_label"],
            definition=r["definition"],
            examples=r["examples"],
            stakeholder_requirements=r["stakeholder_requirements"],
            metrics=metrics_by_pa.get(r["path_aspect_id"], []),
        )
        for r in path_rows
    ]


@router.get("/metrics/{metric_id}", response_model=MetricDetail)
def get_metric(metric_id: str, db: Session = Depends(get_db)) -> MetricDetail:
    """Return a metric with its distinct associated aspects across all paths."""
    metric_row = db.execute(
        text("""
            SELECT id, label, description, tags,
                   supported_compute_environments, supported_reference_modes
            FROM metrics WHERE id = :id
        """),
        {"id": metric_id},
    ).mappings().one_or_none()

    if metric_row is None:
        raise HTTPException(status_code=404, detail="Metric not found")

    aspect_rows = db.execute(
        text("""
            SELECT DISTINCT a.id, a.label
            FROM aspects a
            JOIN path_aspects pa ON pa.aspect_id = a.id
            JOIN path_aspect_metrics pam ON pam.path_aspect_id = pa.id
            WHERE pam.metric_id = :metric_id
            ORDER BY a.label
        """),
        {"metric_id": metric_id},
    ).mappings().all()

    return MetricDetail(
        id=metric_row["id"],
        label=metric_row["label"],
        description=metric_row["description"],
        tags=list(metric_row["tags"] or []),
        supported_compute_environments=list(metric_row["supported_compute_environments"] or []),
        supported_reference_modes=list(metric_row["supported_reference_modes"] or []),
        aspects=[AspectSummary(id=r["id"], label=r["label"]) for r in aspect_rows],
    )


@router.get("/metrics", response_model=list[MetricSummary])
def get_metrics(db: Session = Depends(get_db)) -> list[MetricSummary]:
    """Return all metrics ordered by label."""
    rows = db.execute(
        text("SELECT id, label FROM metrics ORDER BY label")
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/infrastructure", response_model=InfrastructureSchema)
def get_infrastructure() -> InfrastructureSchema:
    """Return the hardcoded infrastructure options (compute environment and reference mode)."""
    return _INFRASTRUCTURE


@router.post("/metrics", response_model=MetricDetail, status_code=201,
             dependencies=[Depends(require_admin)])
def create_metric(body: MetricWrite, db: Session = Depends(get_db)) -> MetricDetail:
    """Create a new metric. Returns 409 if the id already exists."""
    existing = db.execute(
        text("SELECT id FROM metrics WHERE id = :id"), {"id": body.id}
    ).one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="A metric with this id already exists.")

    db.execute(
        text("""
            INSERT INTO metrics (id, label, description, tags,
                                 supported_compute_environments, supported_reference_modes)
            VALUES (:id, :label, :description, :tags, :compute, :reference)
        """),
        {
            "id": body.id,
            "label": body.label,
            "description": body.description,
            "tags": body.tags,
            "compute": body.supported_compute_environments,
            "reference": body.supported_reference_modes,
        },
    )
    db.commit()
    return get_metric(body.id, db)


@router.put("/metrics/{metric_id}", response_model=MetricDetail,
            dependencies=[Depends(require_admin)])
def update_metric(
    metric_id: str, body: MetricWrite, db: Session = Depends(get_db)
) -> MetricDetail:
    """Update an existing metric's content fields."""
    existing = db.execute(
        text("SELECT id FROM metrics WHERE id = :id"), {"id": metric_id}
    ).one_or_none()
    if existing is None:
        raise HTTPException(status_code=404, detail="Metric not found")

    db.execute(
        text("""
            UPDATE metrics
               SET label       = :label,
                   description = :description,
                   tags        = :tags,
                   supported_compute_environments = :compute,
                   supported_reference_modes      = :reference
             WHERE id = :id
        """),
        {
            "id": metric_id,
            "label": body.label,
            "description": body.description,
            "tags": body.tags,
            "compute": body.supported_compute_environments,
            "reference": body.supported_reference_modes,
        },
    )
    db.commit()
    return get_metric(metric_id, db)


@router.delete("/metrics/{metric_id}", status_code=204,
               dependencies=[Depends(require_admin)])
def delete_metric(metric_id: str, db: Session = Depends(get_db)) -> None:
    """Delete a metric. Returns 409 if it is linked to any path aspect."""
    existing = db.execute(
        text("SELECT id FROM metrics WHERE id = :id"), {"id": metric_id}
    ).one_or_none()
    if existing is None:
        raise HTTPException(status_code=404, detail="Metric not found")

    # Check path links
    path_blocking = db.execute(
        text("""
            SELECT p.id AS path_id
              FROM path_aspect_metrics pam
              JOIN path_aspects pa ON pa.id = pam.path_aspect_id
              JOIN paths p         ON p.id  = pa.path_id
             WHERE pam.metric_id = :metric_id
        """),
        {"metric_id": metric_id},
    ).mappings().all()

    # Check evaluation run links
    run_blocking = db.execute(
        text("SELECT run_id FROM run_metrics WHERE metric_id = :metric_id"),
        {"metric_id": metric_id},
    ).mappings().all()

    # Check aspect pool links
    aspect_blocking = db.execute(
        text("SELECT aspect_id FROM aspect_metrics WHERE metric_id = :metric_id"),
        {"metric_id": metric_id},
    ).mappings().all()

    if path_blocking or run_blocking or aspect_blocking:
        path_ids = [r["path_id"] for r in path_blocking]
        run_ids = [r["run_id"] for r in run_blocking]
        aspect_ids = [r["aspect_id"] for r in aspect_blocking]
        raise HTTPException(
            status_code=409,
            detail={
                "message": f"Metric is linked to {len(path_ids)} path(s), {len(run_ids)} run(s), and {len(aspect_ids)} aspect pool(s).",
                "blocking_paths": path_ids,
                "blocking_runs": run_ids,
                "blocking_aspects": aspect_ids,
            },
        )

    db.execute(text("DELETE FROM metrics WHERE id = :id"), {"id": metric_id})
    db.commit()


@router.post("/aspects", response_model=AspectDetail, status_code=201,
             dependencies=[Depends(require_admin)])
def create_aspect(body: AspectWrite, db: Session = Depends(get_db)) -> AspectDetail:
    """Create a new aspect with optional metric assignments. Returns 409 if id exists."""
    existing = db.execute(
        text("SELECT id FROM aspects WHERE id = :id"), {"id": body.id}
    ).one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="An aspect with this id already exists.")

    db.execute(
        text("INSERT INTO aspects (id, label, description) VALUES (:id, :label, :description)"),
        {"id": body.id, "label": body.label, "description": body.description},
    )
    try:
        for metric_id in body.metric_ids:
            db.execute(
                text("""
                    INSERT INTO aspect_metrics (aspect_id, metric_id)
                    VALUES (:aspect_id, :metric_id)
                    ON CONFLICT DO NOTHING
                """),
                {"aspect_id": body.id, "metric_id": metric_id},
            )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=422, detail="One or more metric_ids do not exist.")
    return get_aspect(body.id, db)


@router.put("/aspects/{aspect_id}", response_model=AspectDetail,
            dependencies=[Depends(require_admin)])
def update_aspect(
    aspect_id: str, body: AspectWrite, db: Session = Depends(get_db)
) -> AspectDetail:
    """Update an aspect's label, description, and metric pool."""
    existing = db.execute(
        text("SELECT id FROM aspects WHERE id = :id"), {"id": aspect_id}
    ).one_or_none()
    if existing is None:
        raise HTTPException(status_code=404, detail="Aspect not found")

    db.execute(
        text("UPDATE aspects SET label = :label, description = :description WHERE id = :id"),
        {"id": aspect_id, "label": body.label, "description": body.description},
    )

    # Check that metrics being removed are not still in use in paths for this aspect
    current_metric_ids_rows = db.execute(
        text("SELECT metric_id FROM aspect_metrics WHERE aspect_id = :aspect_id"),
        {"aspect_id": aspect_id},
    ).mappings().all()
    current_ids = {r["metric_id"] for r in current_metric_ids_rows}
    new_ids = set(body.metric_ids)
    removing_ids = current_ids - new_ids

    if removing_ids:
        path_linked = db.execute(
            text("""
                SELECT DISTINCT pam.metric_id
                FROM path_aspect_metrics pam
                JOIN path_aspects pa ON pa.id = pam.path_aspect_id
                WHERE pa.aspect_id = :aspect_id
                  AND pam.metric_id = ANY(:removing_ids)
            """),
            {"aspect_id": aspect_id, "removing_ids": list(removing_ids)},
        ).mappings().all()

        if path_linked:
            blocked = [r["metric_id"] for r in path_linked]
            raise HTTPException(
                status_code=409,
                detail={
                    "message": f"Cannot remove {len(blocked)} metric(s) that are still used in paths.",
                    "blocked_metric_ids": blocked,
                },
            )

    # Replace metric pool: delete existing rows, insert new set
    db.execute(
        text("DELETE FROM aspect_metrics WHERE aspect_id = :aspect_id"),
        {"aspect_id": aspect_id},
    )
    try:
        for metric_id in body.metric_ids:
            db.execute(
                text("""
                    INSERT INTO aspect_metrics (aspect_id, metric_id)
                    VALUES (:aspect_id, :metric_id)
                    ON CONFLICT DO NOTHING
                """),
                {"aspect_id": aspect_id, "metric_id": metric_id},
            )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=422, detail="One or more metric_ids do not exist.")
    return get_aspect(aspect_id, db)


@router.delete("/aspects/{aspect_id}", status_code=204,
               dependencies=[Depends(require_admin)])
def delete_aspect(aspect_id: str, db: Session = Depends(get_db)) -> None:
    """Delete an aspect. Returns 409 if it is used in any path."""
    existing = db.execute(
        text("SELECT id FROM aspects WHERE id = :id"), {"id": aspect_id}
    ).one_or_none()
    if existing is None:
        raise HTTPException(status_code=404, detail="Aspect not found")

    blocking = db.execute(
        text("""
            SELECT p.id AS path_id
              FROM path_aspects pa
              JOIN paths p ON p.id = pa.path_id
             WHERE pa.aspect_id = :aspect_id
        """),
        {"aspect_id": aspect_id},
    ).mappings().all()

    if blocking:
        path_ids = [r["path_id"] for r in blocking]
        raise HTTPException(
            status_code=409,
            detail={
                "message": f"Aspect is used in {len(path_ids)} path(s).",
                "blocking_paths": path_ids,
            },
        )

    db.execute(text("DELETE FROM aspects WHERE id = :id"), {"id": aspect_id})
    db.commit()
