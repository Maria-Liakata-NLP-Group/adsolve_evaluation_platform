"""HTTP endpoints for running metric calculations through the metric API.

The frontend talks only to these routes; it never reaches the metric API itself,
so METRIC_API_TOKEN stays inside this process.
"""

from __future__ import annotations

import os
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..db import get_db
from ..ingestion.schemas import IngestRequest
from ..ingestion.service import create_run_from_ingest
from ..ingestion.writer import known_metric_ids
from ..routers.config import require_admin
from . import store
from .client import (
    EvaluationSettings,
    MetricApiClient,
    MetricApiError,
    get_metric_client,
    get_settings,
)
from .naming import to_run_name
from .schemas import CalculateRequest, JobStatus

router = APIRouter(prefix="/api")

CALLBACK_HEADER = "X-Admin-Token"


def _as_http_error(exc: MetricApiError) -> HTTPException:
    """Map a metric API failure onto a status code for our own caller.

    The API's own 422s describe a request the user can fix, so they pass through
    unchanged. Anything else is an upstream problem, which is a 502 here.
    """
    if exc.status_code == 422:
        return HTTPException(status_code=422, detail=exc.detail)
    return HTTPException(
        status_code=502, detail=f"Metric calculation service error: {exc.detail}"
    )


def _require_known_path(db: Session, path_id: str) -> None:
    exists = db.execute(
        text("SELECT 1 FROM paths WHERE id = :id"), {"id": path_id}
    ).scalar_one_or_none()
    if exists is None:
        raise HTTPException(status_code=422, detail=[f"Unknown path_id: {path_id}"])


def _require_known_metrics(db: Session, metric_ids: list[str]) -> None:
    """Reject metrics the platform could not ingest results for.

    Checked before dispatch: the alternative is discovering the mismatch in the
    callback, after a run that can take hours.
    """
    unknown = sorted(set(metric_ids) - known_metric_ids(db))
    if unknown:
        raise HTTPException(
            status_code=422,
            detail=[f"Unknown metric ids: {', '.join(unknown)}"],
        )


def _submission_payload(
    body: CalculateRequest, job_id: str, settings: EvaluationSettings
) -> dict[str, Any]:
    """Build the metric API's EvaluationRequest.

    `metadata` is opaque to the metric API and echoed back verbatim on the
    callback, which is what makes that callback a valid IngestRequest.
    """
    return {
        "name": to_run_name(body.title),
        "metrics": body.metrics,
        "llm_summaries": body.llm_summaries,
        "gold_summaries": body.gold_summaries,
        "posts": body.inputs,
        "sensitive": body.dataset.sensitive,
        "callback": {
            "url": settings.callback_url(job_id),
            "token": os.environ.get("ADMIN_TOKEN", ""),
            "header_name": CALLBACK_HEADER,
        },
        "metadata": {
            "path_id": body.path_id,
            "title": body.title,
            "notes": body.notes,
            "dataset": body.dataset.model_dump(),
            "model": body.model.model_dump(),
        },
    }


# Declared before /evaluations/{job_id} so the literal path is matched first.
@router.get("/evaluations/metrics", dependencies=[Depends(require_admin)])
def list_calculable_metrics(
    db: Session = Depends(get_db),
    client: MetricApiClient = Depends(get_metric_client),
) -> list[dict[str, Any]]:
    """Metrics this platform can both calculate and store results for."""
    try:
        offered = client.list_metrics()
    except MetricApiError as exc:
        raise _as_http_error(exc) from exc

    known = known_metric_ids(db)
    return [metric for metric in offered if metric["id"] in known]


@router.post(
    "/evaluations", status_code=202, dependencies=[Depends(require_admin)]
)
def submit_evaluation(
    body: CalculateRequest,
    db: Session = Depends(get_db),
    settings: EvaluationSettings = Depends(get_settings),
    client: MetricApiClient = Depends(get_metric_client),
) -> dict[str, str]:
    """Dispatch a calculation and return the platform's id for it."""
    _require_known_path(db, body.path_id)
    _require_known_metrics(db, body.metrics)

    # The id is minted here so it can go in the callback URL, and the row is
    # committed before dispatch so a fast job cannot call back before it exists.
    job_id = str(uuid.uuid4())
    store.create_job(db, job_id, body.path_id, body.title, body.notes)
    db.commit()

    try:
        response = client.submit(_submission_payload(body, job_id, settings))
    except MetricApiError as exc:
        store.delete_job(db, job_id)
        db.commit()
        raise _as_http_error(exc) from exc

    store.set_metric_job_id(db, job_id, response["job_id"])
    db.commit()
    return {"job_id": job_id}


def _sync_from_metric_api(
    db: Session, job: dict[str, Any], client: MetricApiClient
) -> dict[str, Any]:
    """Refresh a non-terminal job from the metric API and return the current row.

    This is the only thing that can fail a job: the metric API sends no callback
    when a run fails, by design — there is nothing to ingest.
    """
    if job["status"] in store.TERMINAL_STATUSES or not job["metric_job_id"]:
        return job

    try:
        remote = client.get_job(job["metric_job_id"])
    except MetricApiError as exc:
        if exc.status_code == 404:
            # Past its retention window; the results are gone for good.
            store.set_status(db, job["id"], "failed",
                             error="The metric calculation service no longer has this job.")
            db.commit()
            return store.get_job(db, job["id"])
        # The service being unreachable is not this job's failure — report what
        # we last knew and let the next poll try again.
        return job

    status = remote.get("status")
    if status == "failed":
        store.set_status(db, job["id"], "failed", error=remote.get("error"))
    elif status == "succeeded" and remote.get("callback_status") == "failed":
        store.set_status(db, job["id"], "failed",
                         error="Results were computed but could not be delivered "
                               "to the platform.")
    elif status == "running":
        store.set_status(db, job["id"], "running")
    else:
        # queued, or succeeded with the callback still in flight — the callback
        # is what completes a job, so leave the row alone.
        return job

    db.commit()
    return store.get_job(db, job["id"])


@router.get(
    "/evaluations/{job_id}",
    response_model=JobStatus,
    dependencies=[Depends(require_admin)],
)
def get_evaluation(
    job_id: str,
    db: Session = Depends(get_db),
    client: MetricApiClient = Depends(get_metric_client),
) -> JobStatus:
    """Current status of one job, refreshed from the metric API when in flight."""
    job = store.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown job id")

    job = _sync_from_metric_api(db, job, client)
    return JobStatus(
        job_id=job["id"],
        status=job["status"],
        title=job["title"],
        error=job["error"],
        run_id=job["run_id"],
        submitted_at=job["submitted_at"],
        finished_at=job["finished_at"],
    )


@router.post(
    "/evaluations/{job_id}/callback",
    status_code=201,
    dependencies=[Depends(require_admin)],
)
def receive_results(
    job_id: str,
    body: IngestRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> dict[str, int]:
    """Persist results delivered by the metric API for this job."""
    job = store.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown job id")

    # The metric API retries up to three times, so a slow first response must
    # not produce a second run. Already ingested means already done.
    if job["run_id"] is not None:
        response.status_code = 200
        return {"run_id": job["run_id"]}

    try:
        run_id = create_run_from_ingest(body, db)
    except HTTPException as exc:
        # A 4xx tells the metric API to stop retrying and keep the results, so
        # record why the platform could not accept them.
        if exc.status_code < 500:
            store.set_status(db, job_id, "failed", error=str(exc.detail))
            db.commit()
        raise

    store.link_run(db, job_id, run_id)
    db.commit()
    return {"run_id": run_id}
