import os
import pytest

TEST_TOKEN = "test-admin-token-abc123"


def test_verify_returns_200_with_valid_token(client):
    os.environ["ADMIN_TOKEN"] = TEST_TOKEN
    response = client.get("/api/admin/verify", headers={"X-Admin-Token": TEST_TOKEN})
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_verify_returns_401_with_wrong_token(client):
    os.environ["ADMIN_TOKEN"] = TEST_TOKEN
    response = client.get("/api/admin/verify", headers={"X-Admin-Token": "wrong"})
    assert response.status_code == 401


def test_verify_returns_422_with_no_token(client):
    response = client.get("/api/admin/verify")
    assert response.status_code == 422


TEST_METRIC_ID = "test_metric_plan_poc"


@pytest.fixture
def created_metric(client):
    """Create a test metric before the test and delete it after."""
    os.environ["ADMIN_TOKEN"] = TEST_TOKEN
    headers = {"X-Admin-Token": TEST_TOKEN}
    client.post("/api/metrics", json={
        "id": TEST_METRIC_ID,
        "label": "Test Metric PoC",
        "description": "Created by the test suite",
        "tags": ["test"],
        "supported_compute_environments": ["cpu_only"],
        "supported_reference_modes": ["reference_free"],
    }, headers=headers)
    yield TEST_METRIC_ID
    client.delete(f"/api/metrics/{TEST_METRIC_ID}", headers=headers)


def test_create_metric(client):
    os.environ["ADMIN_TOKEN"] = TEST_TOKEN
    headers = {"X-Admin-Token": TEST_TOKEN}
    payload = {
        "id": TEST_METRIC_ID,
        "label": "Test Metric PoC",
        "description": "A test metric",
        "tags": ["test"],
        "supported_compute_environments": ["cpu_only"],
        "supported_reference_modes": ["reference_free"],
    }
    response = client.post("/api/metrics", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == TEST_METRIC_ID
    assert data["label"] == "Test Metric PoC"

    # Cleanup
    client.delete(f"/api/metrics/{TEST_METRIC_ID}", headers=headers)


def test_create_metric_requires_auth(client):
    response = client.post("/api/metrics", json={
        "id": "should_not_exist",
        "label": "No Auth",
    })
    assert response.status_code == 422  # missing header


def test_create_metric_duplicate_id_returns_409(client, created_metric):
    os.environ["ADMIN_TOKEN"] = TEST_TOKEN
    headers = {"X-Admin-Token": TEST_TOKEN}
    response = client.post("/api/metrics", json={
        "id": TEST_METRIC_ID,
        "label": "Duplicate",
    }, headers=headers)
    assert response.status_code == 409
