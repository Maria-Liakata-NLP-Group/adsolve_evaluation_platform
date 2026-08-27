"""HTTP endpoint for ingesting completed evaluation results."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..db import get_db
from ..routers.config import require_admin
from .parser import IngestValidationError, parse_run
from .schemas import IngestRequest
from .writer import known_metric_ids, write_run

router = APIRouter(prefix="/api")


@router.post(
    "/runs/ingest",
    status_code=201,
    dependencies=[Depends(require_admin)],
)
def ingest_run(body: IngestRequest, db: Session = Depends(get_db)) -> dict:
    """Persist a completed evaluation and return the id of the run it created."""
    path_exists = db.execute(
        text("SELECT 1 FROM paths WHERE id = :path_id"), {"path_id": body.path_id}
    ).scalar_one_or_none()
    if path_exists is None:
        raise HTTPException(
            status_code=422, detail=[f"Unknown path_id: {body.path_id}"]
        )

    try:
        parsed = parse_run(body, known_metric_ids(db))
    except IngestValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors) from exc

    # One transaction: a failure part-way through must leave no rows behind.
    # write_run also raises IngestValidationError — it refuses to change an
    # existing dataset's sensitivity flag.
    try:
        run_id = write_run(db, body, parsed)
        db.commit()
    except IngestValidationError as exc:
        db.rollback()
        raise HTTPException(status_code=422, detail=exc.errors) from exc
    except Exception:
        db.rollback()
        raise

    return {"run_id": run_id}
