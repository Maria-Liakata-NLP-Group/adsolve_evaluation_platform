import os
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text as sql_text

from api.db import _SessionLocal

TEST_TOKEN = "test-admin-token-abc123"
TEST_PATH_ID = "ingestion_endpoint_test_path"
TEST_TITLE = "Ingestion endpoint test run"
TEST_DATASET = "Ingestion endpoint test dataset"
TEST_MODEL = "Ingestion endpoint test model"
HEADERS = {"X-Admin-Token": TEST_TOKEN}


def _body(**overrides: Any) -> dict[str, Any]:
    body = {
        "path_id": TEST_PATH_ID,
        "title": TEST_TITLE,
        "dataset": {"name": TEST_DATASET, "sensitive": False},
        "model": {"name": TEST_MODEL},
        "results": {
            "document_ids": ["doc-a", "doc-b"],
            "intra_nli": {"mean": 0.5, "document_level": [0.4, 0.6]},
        },
    }
    body.update(overrides)
    return body


def _cleanup() -> None:
    """Remove everything these tests create, including their throwaway path."""
    session = _SessionLocal()
    # Scoped to the (path_id, title) unique constraint: keying on title alone
    # could cascade into a real run that happens to share the title.
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


def _create_test_path() -> None:
    """Create a throwaway path so the tests never depend on existing data."""
    session = _SessionLocal()
    session.execute(sql_text("""
        INSERT INTO paths (id, use_case_id, task_id, data_source_id, data_source_label)
        SELECT :id, use_case_id, task_id, 'ingestion_test_source', 'Ingestion Test Source'
        FROM paths WHERE id <> :id ORDER BY id LIMIT 1
        ON CONFLICT (id) DO NOTHING
    """), {"id": TEST_PATH_ID})
    session.commit()
    session.close()


@pytest.fixture(autouse=True)
def clean_database() -> Iterator[None]:
    os.environ["ADMIN_TOKEN"] = TEST_TOKEN
    _cleanup()
    _create_test_path()
    yield
    _cleanup()


def test_ingest_requires_a_token(client: TestClient) -> None:
    response = client.post("/api/runs/ingest", json=_body())

    assert response.status_code == 422


def test_ingest_rejects_a_wrong_token(client: TestClient) -> None:
    response = client.post(
        "/api/runs/ingest", json=_body(), headers={"X-Admin-Token": "wrong"}
    )

    assert response.status_code == 401


def test_ingest_returns_the_new_run_id(client: TestClient) -> None:
    response = client.post("/api/runs/ingest", json=_body(), headers=HEADERS)

    assert response.status_code == 201
    assert isinstance(response.json()["run_id"], int)


def test_ingested_run_appears_in_the_dashboard(client: TestClient) -> None:
    run_id = client.post(
        "/api/runs/ingest", json=_body(), headers=HEADERS
    ).json()["run_id"]

    dashboard = client.get(f"/api/runs/{run_id}/dashboard")

    assert dashboard.status_code == 200
    scores = dashboard.json()["scores"]
    assert len(scores) == 1
    assert scores[0]["metric_id"] == "intra_nli"
    assert scores[0]["mean_score"] == 0.5
    assert len(scores[0]["document_scores"]) == 2


def test_ingest_rejects_an_unknown_path(client: TestClient) -> None:
    response = client.post(
        "/api/runs/ingest", json=_body(path_id="not_a_path"), headers=HEADERS
    )

    assert response.status_code == 422
    assert "not_a_path" in str(response.json()["detail"])


def test_ingest_rejects_an_unknown_metric(client: TestClient) -> None:
    response = client.post("/api/runs/ingest", json=_body(results={
        "document_ids": ["doc-a"],
        "not_a_metric": {"mean": 0.5, "document_level": [0.5]},
    }), headers=HEADERS)

    assert response.status_code == 422
    assert "not_a_metric" in str(response.json()["detail"])


def test_ingest_rejects_misaligned_scores(client: TestClient) -> None:
    response = client.post("/api/runs/ingest", json=_body(results={
        "document_ids": ["doc-a", "doc-b"],
        "intra_nli": {"mean": 0.5, "document_level": [0.4]},
    }), headers=HEADERS)

    assert response.status_code == 422
    assert "document_level" in str(response.json()["detail"])


def test_ingest_rejects_changing_dataset_sensitivity(client: TestClient) -> None:
    """write_run raises IngestValidationError here — it must surface as 422, not 500."""
    first = client.post("/api/runs/ingest", json=_body(), headers=HEADERS)
    assert first.status_code == 201

    flipped = _body()
    flipped["dataset"] = {"name": TEST_DATASET, "sensitive": True}
    response = client.post("/api/runs/ingest", json=flipped, headers=HEADERS)

    assert response.status_code == 422
    assert "already exists with sensitive" in str(response.json()["detail"])


def test_a_rejected_ingest_writes_nothing(client: TestClient) -> None:
    client.post("/api/runs/ingest", json=_body(results={
        "document_ids": ["doc-a", "doc-b"],
        "intra_nli": {"mean": 0.5, "document_level": [0.4]},
    }), headers=HEADERS)

    session = _SessionLocal()
    runs = session.execute(sql_text(
        "SELECT COUNT(*) FROM evaluation_runs WHERE title = :t"
    ), {"t": TEST_TITLE}).scalar_one()
    datasets = session.execute(sql_text(
        "SELECT COUNT(*) FROM datasets WHERE name = :d"
    ), {"d": TEST_DATASET}).scalar_one()
    session.close()

    assert runs == 0
    assert datasets == 0
