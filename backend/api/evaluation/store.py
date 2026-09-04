"""Reads and writes the `evaluation_jobs` bookkeeping table.

A job row tracks one calculation submitted to the metric API: what was asked for,
how it is going, and which run it eventually produced. Dataset content is never
written here — it is forwarded to the metric API and comes back, if at all, through
the ingestion writer.
"""

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

# Statuses that mean the job will not change again without a new submission.
TERMINAL_STATUSES = frozenset({"succeeded", "failed"})


def create_job(
    db: Session,
    job_id: str,
    path_id: str,
    title: str,
    notes: Optional[str],
) -> None:
    """Insert a queued job. Called before submitting, so the callback can never
    arrive before the row it refers to exists."""
    db.execute(
        text("""
            INSERT INTO evaluation_jobs (id, path_id, title, notes, status)
            VALUES (:id, :path_id, :title, :notes, 'queued')
        """),
        {"id": job_id, "path_id": path_id, "title": title, "notes": notes},
    )


def get_job(db: Session, job_id: str) -> Optional[dict[str, Any]]:
    """One job row as a dict, or None if the id is unknown."""
    row = db.execute(
        text("SELECT * FROM evaluation_jobs WHERE id = :id"), {"id": job_id}
    ).mappings().one_or_none()
    return dict(row) if row else None


def set_metric_job_id(db: Session, job_id: str, metric_job_id: str) -> None:
    """Record the id the metric API assigned, which status polling needs."""
    db.execute(
        text("UPDATE evaluation_jobs SET metric_job_id = :m WHERE id = :id"),
        {"m": metric_job_id, "id": job_id},
    )


def set_status(
    db: Session, job_id: str, status: str, error: Optional[str] = None
) -> None:
    """Update status, stamping finished_at only when the status is terminal."""
    finished = "NOW()" if status in TERMINAL_STATUSES else "finished_at"
    db.execute(
        text(f"""
            UPDATE evaluation_jobs
            SET status = :status, error = :error, finished_at = {finished}
            WHERE id = :id
        """),
        {"status": status, "error": error, "id": job_id},
    )


def link_run(db: Session, job_id: str, run_id: int) -> None:
    """Attach the run the callback produced and mark the job succeeded."""
    db.execute(
        text("""
            UPDATE evaluation_jobs
            SET run_id = :run_id, status = 'succeeded', finished_at = NOW()
            WHERE id = :id
        """),
        {"run_id": run_id, "id": job_id},
    )


def delete_job(db: Session, job_id: str) -> None:
    """Remove a job row — used when the submission to the metric API failed."""
    db.execute(text("DELETE FROM evaluation_jobs WHERE id = :id"), {"id": job_id})
