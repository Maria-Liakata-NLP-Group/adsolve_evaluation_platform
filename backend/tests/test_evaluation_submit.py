"""POST /api/evaluations — dispatching a calculation to the metric API."""

import os
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text as sql_text

from api.db import _SessionLocal
from api.evaluation.client import MetricApiError, get_metric_client
from api.main import app
from tests.fakes import FakeMetricClient

TEST_TOKEN = "test-admin-token-abc123"
TEST_PATH_ID = "evaluation_submit_test_path"
HEADERS = {"X-Admin-Token": TEST_TOKEN}


def _body(**overrides: Any) -> dict[str, Any]:
    body = {
        "path_id": TEST_PATH_ID,
        "title": "Baseline run #2",
        "notes": "a note",
        "dataset": {"name": "Submit test dataset", "sensitive": False},
        "model": {"name": "Submit test model"},
        "metrics": ["rouge", "intra_nli"],
        "llm_summaries": {"doc-a": "summary a", "doc-b": "summary b"},
        "gold_summaries": {"doc-a": "gold a", "doc-b": "gold b"},
        "inputs": {"doc-a": ["post 1"], "doc-b": ["post 2"]},
    }
    body.update(overrides)
    return body


def _cleanup() -> None:
    session = _SessionLocal()
    session.execute(
        sql_text("DELETE FROM evaluation_jobs WHERE path_id = :p"), {"p": TEST_PATH_ID}
    )
    session.execute(sql_text("DELETE FROM paths WHERE id = :id"), {"id": TEST_PATH_ID})
    session.commit()
    session.close()


def _job_rows() -> list[dict[str, Any]]:
    session = _SessionLocal()
    rows = session.execute(
        sql_text("SELECT * FROM evaluation_jobs WHERE path_id = :p"), {"p": TEST_PATH_ID}
    ).mappings().all()
    session.close()
    return [dict(row) for row in rows]


@pytest.fixture(autouse=True)
def environment(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    os.environ["ADMIN_TOKEN"] = TEST_TOKEN
    monkeypatch.setenv("METRIC_API_URL", "http://metrics.test")
    monkeypatch.setenv("METRIC_API_TOKEN", "metric-token")
    monkeypatch.setenv("PLATFORM_CALLBACK_URL", "http://platform.test")
    _cleanup()
    session = _SessionLocal()
    session.execute(sql_text("""
        INSERT INTO paths (id, use_case_id, task_id, data_source_id, data_source_label)
        SELECT :id, use_case_id, task_id, 'evaluation_submit_source', 'Submit Test Source'
        FROM paths WHERE id <> :id ORDER BY id LIMIT 1
        ON CONFLICT (id) DO NOTHING
    """), {"id": TEST_PATH_ID})
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


def test_successful_submission_returns_the_platform_job_id(client: TestClient) -> None:
    _use(FakeMetricClient())
    response = client.post("/api/evaluations", json=_body(), headers=HEADERS)
    assert response.status_code == 202
    assert response.json()["job_id"]


def test_successful_submission_records_a_queued_job(client: TestClient) -> None:
    _use(FakeMetricClient())
    client.post("/api/evaluations", json=_body(), headers=HEADERS)

    rows = _job_rows()
    assert len(rows) == 1
    assert rows[0]["status"] == "queued"
    assert rows[0]["title"] == "Baseline run #2"
    assert rows[0]["metric_job_id"] == "api-uuid"
    assert rows[0]["run_id"] is None


def test_forwarded_payload_carries_the_data_and_metrics(client: TestClient) -> None:
    fake = _use(FakeMetricClient())
    client.post("/api/evaluations", json=_body(), headers=HEADERS)

    sent = fake.submitted[0]
    assert sent["metrics"] == ["rouge", "intra_nli"]
    assert sent["llm_summaries"] == {"doc-a": "summary a", "doc-b": "summary b"}
    assert sent["gold_summaries"] == {"doc-a": "gold a", "doc-b": "gold b"}
    # The platform calls them `inputs`; the metric API calls them `posts`.
    assert sent["posts"] == {"doc-a": ["post 1"], "doc-b": ["post 2"]}
    assert sent["sensitive"] is False


def test_forwarded_payload_derives_a_valid_run_name(client: TestClient) -> None:
    fake = _use(FakeMetricClient())
    client.post("/api/evaluations", json=_body(), headers=HEADERS)
    assert fake.submitted[0]["name"] == "baseline_run_2"


def test_forwarded_metadata_is_a_valid_ingest_request(client: TestClient) -> None:
    """The API echoes metadata back verbatim, so it must carry every ingest field."""
    fake = _use(FakeMetricClient())
    client.post("/api/evaluations", json=_body(), headers=HEADERS)

    metadata = fake.submitted[0]["metadata"]
    assert metadata["path_id"] == TEST_PATH_ID
    assert metadata["title"] == "Baseline run #2"
    assert metadata["notes"] == "a note"
    assert metadata["dataset"] == {"name": "Submit test dataset", "sensitive": False}
    assert metadata["model"] == {"name": "Submit test model"}


def test_callback_points_back_at_this_job(client: TestClient) -> None:
    fake = _use(FakeMetricClient())
    job_id = client.post(
        "/api/evaluations", json=_body(), headers=HEADERS
    ).json()["job_id"]

    callback = fake.submitted[0]["callback"]
    assert callback["url"] == f"http://platform.test/api/evaluations/{job_id}/callback"
    assert callback["token"] == TEST_TOKEN
    assert callback["header_name"] == "X-Admin-Token"


def test_sensitive_flag_is_passed_through(client: TestClient) -> None:
    fake = _use(FakeMetricClient())
    body = _body(dataset={"name": "Submit test dataset", "sensitive": True})
    client.post("/api/evaluations", json=body, headers=HEADERS)
    assert fake.submitted[0]["sensitive"] is True


def test_unknown_metric_is_rejected_before_the_api_is_called(client: TestClient) -> None:
    """A six-hour run must not end in an ingest failure over a typo."""
    fake = _use(FakeMetricClient())
    response = client.post(
        "/api/evaluations", json=_body(metrics=["rouge", "not_a_metric"]), headers=HEADERS
    )
    assert response.status_code == 422
    assert "not_a_metric" in str(response.json()["detail"])
    assert fake.submitted == []
    assert _job_rows() == []


def test_unknown_path_is_rejected(client: TestClient) -> None:
    _use(FakeMetricClient())
    response = client.post(
        "/api/evaluations", json=_body(path_id="no_such_path"), headers=HEADERS
    )
    assert response.status_code == 422


def test_api_validation_error_is_passed_through(client: TestClient) -> None:
    _use(FakeMetricClient(error=MetricApiError(422, ["'gold_summaries' is required"])))
    response = client.post("/api/evaluations", json=_body(), headers=HEADERS)
    assert response.status_code == 422
    assert response.json()["detail"] == ["'gold_summaries' is required"]


def test_unreachable_api_returns_502_and_leaves_no_job_row(client: TestClient) -> None:
    _use(FakeMetricClient(error=MetricApiError(None, "connection refused")))
    response = client.post("/api/evaluations", json=_body(), headers=HEADERS)
    assert response.status_code == 502
    assert _job_rows() == []


def test_api_server_error_returns_502_and_leaves_no_job_row(client: TestClient) -> None:
    _use(FakeMetricClient(error=MetricApiError(500, "boom")))
    response = client.post("/api/evaluations", json=_body(), headers=HEADERS)
    assert response.status_code == 502
    assert _job_rows() == []


def test_unconfigured_service_returns_503(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """No metric API configured must fail loudly, not accept an undispatchable run."""
    monkeypatch.delenv("METRIC_API_URL", raising=False)
    response = client.post("/api/evaluations", json=_body(), headers=HEADERS)
    assert response.status_code == 503


def test_requires_the_admin_token(client: TestClient) -> None:
    _use(FakeMetricClient())
    response = client.post("/api/evaluations", json=_body())
    assert response.status_code == 422  # missing required header
