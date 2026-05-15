from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas.runs import (
    DashboardResponse,
    DatasetRef,
    DocumentScore,
    MetricRef,
    ModelRef,
    RunDetail,
    RunSummary,
    ScoreEntry,
)

router = APIRouter(prefix="/api")


def _run_datasets(run_id: int, db: Session) -> list[DatasetRef]:
    """Fetch all datasets associated with a run."""
    rows = db.execute(
        text("""
            SELECT d.id, d.name FROM run_datasets rd
            JOIN datasets d ON d.id = rd.dataset_id
            WHERE rd.run_id = :run_id ORDER BY d.name
        """),
        {"run_id": run_id},
    ).mappings().all()
    return [DatasetRef(id=r["id"], name=r["name"]) for r in rows]


def _run_models(run_id: int, db: Session) -> list[ModelRef]:
    """Fetch all models associated with a run."""
    rows = db.execute(
        text("""
            SELECT m.id, m.name FROM run_models rm
            JOIN models m ON m.id = rm.model_id
            WHERE rm.run_id = :run_id ORDER BY m.name
        """),
        {"run_id": run_id},
    ).mappings().all()
    return [ModelRef(id=r["id"], name=r["name"]) for r in rows]


def _run_metrics(run_id: int, db: Session) -> list[MetricRef]:
    """Fetch all metrics associated with a run."""
    rows = db.execute(
        text("""
            SELECT metric_id, display_label FROM run_metrics
            WHERE run_id = :run_id ORDER BY metric_id
        """),
        {"run_id": run_id},
    ).mappings().all()
    return [MetricRef(metric_id=r["metric_id"], display_label=r["display_label"]) for r in rows]


@router.get("/runs", response_model=list[RunSummary])
def get_runs(db: Session = Depends(get_db)) -> list[RunSummary]:
    """Return a summary list of all evaluation runs."""
    rows = db.execute(
        text("SELECT id, path_id, title, description FROM evaluation_runs ORDER BY id")
    ).mappings().all()
    runs = []
    for r in rows:
        runs.append(
            RunSummary(
                id=r["id"],
                path_id=r["path_id"],
                title=r["title"],
                description=r["description"],
                datasets=_run_datasets(r["id"], db),
                models=_run_models(r["id"], db),
            )
        )
    return runs


@router.get("/runs/by-path/{path_id}", response_model=RunDetail)
def get_run_by_path(path_id: str, db: Session = Depends(get_db)) -> RunDetail:
    """Return the most recent run detail for a given path_id, or 404 if not found."""
    row = db.execute(
        text("""
            SELECT id, path_id, title, description FROM evaluation_runs
            WHERE path_id = :path_id
            ORDER BY created_at DESC LIMIT 1
        """),
        {"path_id": path_id},
    ).mappings().one_or_none()

    if row is None:
        raise HTTPException(status_code=404, detail="Run not found for path")

    run_id = row["id"]
    return RunDetail(
        id=run_id,
        path_id=row["path_id"],
        title=row["title"],
        description=row["description"],
        datasets=_run_datasets(run_id, db),
        models=_run_models(run_id, db),
        metrics=_run_metrics(run_id, db),
    )


@router.get("/runs/{run_id}/dashboard", response_model=DashboardResponse)
def get_dashboard(
    run_id: int,
    dataset_id: Optional[int] = None,
    model_id: Optional[int] = None,
    db: Session = Depends(get_db),
) -> DashboardResponse:
    """Return aggregated dashboard data for a run, optionally filtered by dataset or model."""
    rows = db.execute(
        text("""
            SELECT ms.dataset_id, ms.model_id, ms.metric_id, ms.mean_score,
                   dms.document_id AS doc_id, dms.score AS doc_score
            FROM   metric_scores ms
            JOIN   document_metric_scores dms ON dms.metric_score_id = ms.id
            WHERE  ms.run_id = :run_id
            AND    (CAST(:dataset_id AS INTEGER) IS NULL
                    OR ms.dataset_id = CAST(:dataset_id AS INTEGER))
            AND    (CAST(:model_id AS INTEGER) IS NULL
                    OR ms.model_id = CAST(:model_id AS INTEGER))
            ORDER  BY ms.metric_id, ms.dataset_id, ms.mean_score DESC, dms.document_id
        """),
        {"run_id": run_id, "dataset_id": dataset_id, "model_id": model_id},
    ).mappings().all()

    # Group flat JOIN rows into per-(dataset, model, metric) score entries.
    grouped: dict[tuple, dict] = {}
    order: list[tuple] = []
    for row in rows:
        key = (row["dataset_id"], row["model_id"], row["metric_id"])
        if key not in grouped:
            grouped[key] = {
                "dataset_id": row["dataset_id"],
                "model_id": row["model_id"],
                "metric_id": row["metric_id"],
                "mean_score": row["mean_score"],
                "document_scores": [],
            }
            order.append(key)
        grouped[key]["document_scores"].append(
            DocumentScore(doc_id=row["doc_id"], score=row["doc_score"])
        )

    scores = [
        ScoreEntry(
            dataset_id=g["dataset_id"],
            model_id=g["model_id"],
            metric_id=g["metric_id"],
            mean_score=g["mean_score"],
            document_scores=g["document_scores"],
        )
        for g in (grouped[k] for k in order)
    ]

    return DashboardResponse(
        run_id=run_id,
        datasets=_run_datasets(run_id, db),
        models=_run_models(run_id, db),
        metrics=_run_metrics(run_id, db),
        scores=scores,
    )
