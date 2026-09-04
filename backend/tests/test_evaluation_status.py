"""GET /api/evaluations/{job_id} — status, syncing from the metric API on read.

The metric API deliberately sends no callback when a job fails, so this endpoint is
the only thing that can move a job out of `running`.
"""

import os
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text as sql_text

from api.db import _SessionLocal
from api.evaluation import store
from api.evaluation.client import MetricApiError, get_metric_client
from api.main import app
from tests.fakes import FakeMetricClient

TEST_TOKEN = "test-admin-token-abc123"
TEST_PATH_ID = "evaluation_status_test_path"
JOB_ID = "33333333-3333-3333-3333-333333333333"
HEADERS = {"X-Admin-Token": TEST_TOKEN}


def _cleanup() -> None:
    session = _SessionLocal()
    session.execute(
        sql_text("DELETE FROM evaluation_jobs WHERE path_id = :p"), {"p": TEST_PATH_ID}
    )
    session.execute(sql_text("DELETE FROM paths WHERE id = :id"), {"id": TEST_PATH_ID})
    session.commit()
    session.close()


def _job() -> dict[str, Any]:
    session = _SessionLocal()
    job = store.get_job(session, JOB_ID)
    session.close()
    return job


@pytest.fixture(autouse=True)
def dispatched_job() -> Iterator[None]:
    os.environ["ADMIN_TOKEN"] = TEST_TOKEN
    _cleanup()
    session = _SessionLocal()
    session.execute(sql_text("""
        INSERT INTO paths (id, use_case_id, task_id, data_source_id, data_source_label)
        SELECT :id, use_case_id, task_id, 'evaluation_status_source', 'Status Source'
        FROM paths WHERE id <> :id ORDER BY id LIMIT 1
        ON CONFLICT (id) DO NOTHING
    """), {"id": TEST_PATH_ID})
    store.create_job(session, JOB_ID, TEST_PATH_ID, "Status test run", None)
    store.set_metric_job_id(session, JOB_ID, "api-uuid")
    session.commit()
    session.close()
    yield
    app.dependency_overrides.clear()
    _cleanup()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _use(fake: FakeMetricClient) -> FakeMetricClient:
    app.dependency_overrides[get_metric_client] = lambda: fake
    return fake


def _get(client: TestClient, job_id: str = JOB_ID):
    return client.get(f"/api/evaluations/{job_id}", headers=HEADERS)


def test_unknown_job_is_not_found(client: TestClient) -> None:
    _use(FakeMetricClient())
    assert _get(client, "no-such-job").status_code == 404


def test_reports_the_job_to_the_caller(client: TestClient) -> None:
    _use(FakeMetricClient(job_response={"status": "queued"}))
    body = _get(client).json()
    assert body["job_id"] == JOB_ID
    assert body["title"] == "Status test run"
    assert body["run_id"] is None


def test_a_running_job_is_synced_from_the_api(client: TestClient) -> None:
    fake = _use(FakeMetricClient(job_response={"status": "running"}))
    assert _get(client).json()["status"] == "running"
    assert fake.jobs_polled == ["api-uuid"]
    assert _job()["status"] == "running"


def test_a_failed_job_records_the_engine_error(client: TestClient) -> None:
    _use(FakeMetricClient(job_response={"status": "failed", "error": "CUDA OOM"}))
    body = _get(client).json()
    assert body["status"] == "failed"
    assert body["error"] == "CUDA OOM"
    assert _job()["finished_at"] is not None


def test_a_terminal_job_is_not_polled_again(client: TestClient) -> None:
    """Once terminal, the metric API has nothing left to tell us."""
    session = _SessionLocal()
    store.set_status(session, JOB_ID, "failed", error="already failed")
    session.commit()
    session.close()

    fake = _use(FakeMetricClient(job_response={"status": "running"}))
    assert _get(client).json()["status"] == "failed"
    assert fake.jobs_polled == []


def test_success_without_delivery_stays_pending(client: TestClient) -> None:
    """The callback, not the poll, is what completes a job — results arrive with it."""
    _use(FakeMetricClient(
        job_response={"status": "succeeded", "callback_status": "pending"}
    ))
    assert _get(client).json()["status"] == "queued"
    assert _job()["run_id"] is None


def test_undeliverable_results_fail_the_job(client: TestClient) -> None:
    """Computed but undeliverable means the platform will never receive them."""
    _use(FakeMetricClient(
        job_response={"status": "succeeded", "callback_status": "failed"}
    ))
    body = _get(client).json()
    assert body["status"] == "failed"
    assert "deliver" in body["error"].lower()


def test_a_job_the_api_has_forgotten_fails(client: TestClient) -> None:
    """Job directories are purged after the retention window."""
    _use(FakeMetricClient(error=MetricApiError(404, "Unknown job id")))
    assert _get(client).json()["status"] == "failed"


def test_an_unreachable_api_reports_the_last_known_state(client: TestClient) -> None:
    """The metric API being down must not fail the user's status request."""
    _use(FakeMetricClient(error=MetricApiError(None, "connection refused")))
    response = _get(client)
    assert response.status_code == 200
    assert response.json()["status"] == "queued"
    assert _job()["status"] == "queued"


def test_requires_the_admin_token(client: TestClient) -> None:
    _use(FakeMetricClient())
    assert client.get(f"/api/evaluations/{JOB_ID}").status_code == 422
