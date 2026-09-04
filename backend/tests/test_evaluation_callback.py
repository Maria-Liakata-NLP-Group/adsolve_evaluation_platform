"""POST /api/evaluations/{job_id}/callback — where the metric API delivers results.

The body the metric API composes is `metadata` (echoed verbatim) plus results plus,
for a non-sensitive run, the three data maps. That is exactly an IngestRequest.
"""

import os
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text as sql_text

from api.db import _SessionLocal
from api.evaluation import store
from api.main import app

TEST_TOKEN = "test-admin-token-abc123"
TEST_PATH_ID = "evaluation_callback_test_path"
TEST_TITLE = "Callback test run"
TEST_DATASET = "Callback test dataset"
TEST_MODEL = "Callback test model"
JOB_ID = "22222222-2222-2222-2222-222222222222"
HEADERS = {"X-Admin-Token": TEST_TOKEN}


def _body(**overrides: Any) -> dict[str, Any]:
    body = {
        "path_id": TEST_PATH_ID,
        "title": TEST_TITLE,
        "notes": None,
        "dataset": {"name": TEST_DATASET, "sensitive": False},
        "model": {"name": TEST_MODEL},
        "llm_summaries": {"doc-a": "summary a", "doc-b": "summary b"},
        "gold_summaries": {"doc-a": "gold a", "doc-b": "gold b"},
        "inputs": {"doc-a": ["post 1"], "doc-b": ["post 2"]},
        "results": {
            "document_ids": ["doc-a", "doc-b"],
            "intra_nli": {"mean": 0.5, "document_level": [0.4, 0.6]},
        },
    }
    body.update(overrides)
    return body


def _cleanup() -> None:
    session = _SessionLocal()
    session.execute(
        sql_text("DELETE FROM evaluation_jobs WHERE path_id = :p"), {"p": TEST_PATH_ID}
    )
    session.execute(
        sql_text("DELETE FROM evaluation_runs WHERE path_id = :p AND title = :t"),
        {"p": TEST_PATH_ID, "t": TEST_TITLE},
    )
    session.execute(sql_text("""
        DELETE FROM documents
        WHERE dataset_id IN (SELECT id FROM datasets WHERE name = :d)
    """), {"d": TEST_DATASET})
    session.execute(sql_text("DELETE FROM datasets WHERE name = :d"), {"d": TEST_DATASET})
    session.execute(sql_text("DELETE FROM models WHERE name = :m"), {"m": TEST_MODEL})
    session.execute(sql_text("DELETE FROM paths WHERE id = :id"), {"id": TEST_PATH_ID})
    session.commit()
    session.close()


def _run_count() -> int:
    session = _SessionLocal()
    count = session.execute(
        sql_text("SELECT COUNT(*) FROM evaluation_runs WHERE path_id = :p AND title = :t"),
        {"p": TEST_PATH_ID, "t": TEST_TITLE},
    ).scalar_one()
    session.close()
    return count


def _job() -> dict[str, Any]:
    session = _SessionLocal()
    job = store.get_job(session, JOB_ID)
    session.close()
    return job


@pytest.fixture(autouse=True)
def queued_job() -> Iterator[None]:
    """A throwaway path with one job already dispatched and awaiting results."""
    os.environ["ADMIN_TOKEN"] = TEST_TOKEN
    _cleanup()
    session = _SessionLocal()
    session.execute(sql_text("""
        INSERT INTO paths (id, use_case_id, task_id, data_source_id, data_source_label)
        SELECT :id, use_case_id, task_id, 'evaluation_callback_source', 'Callback Source'
        FROM paths WHERE id <> :id ORDER BY id LIMIT 1
        ON CONFLICT (id) DO NOTHING
    """), {"id": TEST_PATH_ID})
    store.create_job(session, JOB_ID, TEST_PATH_ID, TEST_TITLE, None)
    store.set_metric_job_id(session, JOB_ID, "api-uuid")
    session.commit()
    session.close()
    yield
    _cleanup()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _post(client: TestClient, body: dict[str, Any], job_id: str = JOB_ID):
    return client.post(f"/api/evaluations/{job_id}/callback", json=body, headers=HEADERS)


def test_delivery_creates_the_run(client: TestClient) -> None:
    response = _post(client, _body())
    assert response.status_code == 201
    assert response.json()["run_id"] == _job()["run_id"]
    assert _run_count() == 1


def test_delivery_marks_the_job_succeeded(client: TestClient) -> None:
    _post(client, _body())
    job = _job()
    assert job["status"] == "succeeded"
    assert job["run_id"] is not None
    assert job["finished_at"] is not None


def test_a_sensitive_run_delivers_results_without_any_text(client: TestClient) -> None:
    """The metric API omits the data maps entirely for a sensitive dataset."""
    body = _body(dataset={"name": TEST_DATASET, "sensitive": True})
    for key in ("llm_summaries", "gold_summaries", "inputs"):
        del body[key]

    assert _post(client, body).status_code == 201
    assert _job()["status"] == "succeeded"


def test_a_repeated_delivery_does_not_create_a_second_run(client: TestClient) -> None:
    """The metric API retries up to three times; a slow response must not duplicate."""
    first = _post(client, _body())
    second = _post(client, _body())

    assert second.status_code == 200
    assert second.json()["run_id"] == first.json()["run_id"]
    assert _run_count() == 1


def test_an_unknown_job_id_is_rejected(client: TestClient) -> None:
    assert _post(client, _body(), job_id="no-such-job").status_code == 404


def test_a_rejected_body_records_the_error_and_creates_no_run(
    client: TestClient,
) -> None:
    """A 4xx tells the metric API to stop retrying and keep the results."""
    body = _body(results={"document_ids": ["doc-a"], "nope": {"mean": 1.0,
                                                             "document_level": [1.0]}})
    response = _post(client, body)

    assert response.status_code == 422
    job = _job()
    assert job["status"] == "failed"
    assert job["run_id"] is None
    assert job["error"]
    assert _run_count() == 0


def test_requires_the_admin_token(client: TestClient) -> None:
    response = client.post(f"/api/evaluations/{JOB_ID}/callback", json=_body())
    assert response.status_code == 422  # missing required header
