"""Persisting a completed evaluation, independent of how it arrived.

Shared by POST /api/runs/ingest (a user attaching a results file) and the metric
API's results callback, so both paths validate and write runs identically.
"""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from .parser import IngestValidationError, parse_run
from .schemas import IngestRequest
from .writer import known_metric_ids, write_run


def create_run_from_ingest(body: IngestRequest, db: Session) -> int:
    """Validate and persist one completed evaluation; return the new run's id."""
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
        db.rollback()
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

    return run_id
