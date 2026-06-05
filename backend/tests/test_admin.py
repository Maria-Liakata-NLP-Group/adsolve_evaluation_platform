import os
import pytest
from sqlalchemy import text as sql_text

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
    setup_response = client.post("/api/metrics", json={
        "id": TEST_METRIC_ID,
        "label": "Test Metric PoC",
        "description": "Created by the test suite",
        "tags": ["test"],
        "supported_compute_environments": ["cpu_only"],
        "supported_reference_modes": ["reference_free"],
    }, headers=headers)
    assert setup_response.status_code == 201, f"Fixture setup failed: {setup_response.json()}"
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


def test_update_metric(client, created_metric):
    os.environ["ADMIN_TOKEN"] = TEST_TOKEN
    headers = {"X-Admin-Token": TEST_TOKEN}
    response = client.put(f"/api/metrics/{TEST_METRIC_ID}", json={
        "id": TEST_METRIC_ID,  # ignored by PUT, included for schema compatibility
        "label": "Updated Label",
        "description": "Updated description",
        "tags": ["updated"],
        "supported_compute_environments": ["gpu_available"],
        "supported_reference_modes": ["reference_based"],
    }, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["label"] == "Updated Label"
    assert data["description"] == "Updated description"
    assert "updated" in data["tags"]


def test_update_metric_not_found(client):
    os.environ["ADMIN_TOKEN"] = TEST_TOKEN
    response = client.put("/api/metrics/nonexistent_metric_xyz", json={
        "id": "nonexistent_metric_xyz",
        "label": "Ghost",
    }, headers={"X-Admin-Token": TEST_TOKEN})
    assert response.status_code == 404


def test_delete_metric_success(client):
    """Create a fresh metric with no path links, then delete it."""
    os.environ["ADMIN_TOKEN"] = TEST_TOKEN
    headers = {"X-Admin-Token": TEST_TOKEN}
    metric_id = "test_metric_delete_target"

    client.post("/api/metrics", json={
        "id": metric_id, "label": "Delete Me",
    }, headers=headers)

    response = client.delete(f"/api/metrics/{metric_id}", headers=headers)
    assert response.status_code == 204

    # Confirm it's gone
    assert client.get(f"/api/metrics/{metric_id}").status_code == 404


def test_delete_metric_blocked_when_linked(client):
    """A metric used in path_aspect_metrics cannot be deleted."""
    os.environ["ADMIN_TOKEN"] = TEST_TOKEN
    # Find a seeded metric that is linked to a path by checking path details
    # Use the first metric from any path
    paths_response = client.get("/api/paths")
    assert paths_response.status_code == 200
    paths = paths_response.json()
    assert len(paths) > 0

    # Get first path detail to find a linked metric
    path_detail = client.get(f"/api/paths/{paths[0]['id']}").json()
    assert len(path_detail["aspects"]) > 0
    assert len(path_detail["aspects"][0]["metrics"]) > 0
    linked_metric_id = path_detail["aspects"][0]["metrics"][0]["id"]

    response = client.delete(f"/api/metrics/{linked_metric_id}",
                             headers={"X-Admin-Token": TEST_TOKEN})
    assert response.status_code == 409
    data = response.json()
    assert "detail" in data


def test_delete_metric_not_found(client):
    os.environ["ADMIN_TOKEN"] = TEST_TOKEN
    response = client.delete("/api/metrics/nonexistent_xyz",
                             headers={"X-Admin-Token": TEST_TOKEN})
    assert response.status_code == 404


TEST_ASPECT_ID = "test_aspect_plan_poc"


@pytest.fixture
def created_aspect(client):
    """Create a test aspect before the test and delete it after."""
    headers = {"X-Admin-Token": TEST_TOKEN}
    response = client.post("/api/aspects", json={
        "id": TEST_ASPECT_ID,
        "label": "Test Aspect PoC",
        "description": "Created by the test suite",
        "metric_ids": [],
    }, headers=headers)
    assert response.status_code == 201, f"Fixture setup failed: {response.json()}"
    yield TEST_ASPECT_ID
    client.delete(f"/api/aspects/{TEST_ASPECT_ID}", headers=headers)


def test_create_aspect(client):
    headers = {"X-Admin-Token": TEST_TOKEN}
    payload = {
        "id": TEST_ASPECT_ID,
        "label": "Test Aspect PoC",
        "description": "A test aspect",
        "metric_ids": [],
    }
    response = client.post("/api/aspects", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == TEST_ASPECT_ID
    assert data["label"] == "Test Aspect PoC"
    assert data["metrics"] == []
    # Cleanup
    client.delete(f"/api/aspects/{TEST_ASPECT_ID}", headers=headers)


def test_create_aspect_requires_auth(client):
    response = client.post("/api/aspects", json={
        "id": "should_not_exist", "label": "No Auth",
    })
    assert response.status_code == 422


def test_create_aspect_duplicate_id_returns_409(client, created_aspect):
    headers = {"X-Admin-Token": TEST_TOKEN}
    response = client.post("/api/aspects", json={
        "id": TEST_ASPECT_ID, "label": "Duplicate",
    }, headers=headers)
    assert response.status_code == 409


def test_update_aspect(client, created_aspect):
    headers = {"X-Admin-Token": TEST_TOKEN}
    response = client.put(f"/api/aspects/{TEST_ASPECT_ID}", json={
        "id": TEST_ASPECT_ID,
        "label": "Updated Aspect Label",
        "description": "Updated description",
        "metric_ids": [],
    }, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["label"] == "Updated Aspect Label"
    assert data["description"] == "Updated description"


def test_update_aspect_not_found(client):
    response = client.put("/api/aspects/nonexistent_aspect_xyz", json={
        "id": "nonexistent_aspect_xyz", "label": "Ghost",
    }, headers={"X-Admin-Token": TEST_TOKEN})
    assert response.status_code == 404


def test_delete_aspect_success(client):
    """Create a fresh aspect with no path links, then delete it."""
    headers = {"X-Admin-Token": TEST_TOKEN}
    aspect_id = "test_aspect_delete_target"
    client.post("/api/aspects", json={"id": aspect_id, "label": "Delete Me"}, headers=headers)
    response = client.delete(f"/api/aspects/{aspect_id}", headers=headers)
    assert response.status_code == 204
    assert client.get(f"/api/aspects/{aspect_id}").status_code == 404


def test_delete_aspect_blocked_when_linked(client):
    """An aspect used in path_aspects cannot be deleted."""
    headers = {"X-Admin-Token": TEST_TOKEN}
    paths_response = client.get("/api/paths")
    paths = paths_response.json()
    path_detail = client.get(f"/api/paths/{paths[0]['id']}").json()
    linked_aspect_id = path_detail["aspects"][0]["id"]
    response = client.delete(f"/api/aspects/{linked_aspect_id}", headers=headers)
    assert response.status_code == 409
    assert "detail" in response.json()


def test_delete_aspect_not_found(client):
    response = client.delete("/api/aspects/nonexistent_xyz",
                             headers={"X-Admin-Token": TEST_TOKEN})
    assert response.status_code == 404


def test_delete_metric_blocked_when_in_aspect_pool(client):
    """A metric in aspect_metrics cannot be deleted."""
    headers = {"X-Admin-Token": TEST_TOKEN}
    aspects_response = client.get("/api/aspects")
    aspects = aspects_response.json()
    metric_in_pool = None
    for aspect in aspects:
        detail = client.get(f"/api/aspects/{aspect['id']}").json()
        if detail.get("metrics"):
            metric_in_pool = detail["metrics"][0]["id"]
            break
    assert metric_in_pool is not None, "No seeded aspect has metrics in pool"
    response = client.delete(f"/api/metrics/{metric_in_pool}", headers=headers)
    assert response.status_code == 409


def test_get_tasks_returns_list(client):
    response = client.get("/api/tasks")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "id" in data[0]
    assert "label" in data[0]


def test_path_detail_includes_run_metric_ids(client):
    paths = client.get("/api/paths").json()
    detail = client.get(f"/api/paths/{paths[0]['id']}").json()
    assert "run_metric_ids" in detail
    assert isinstance(detail["run_metric_ids"], list)


TEST_PATH_LABEL = "Test Data Source Plan PoC"
TEST_PATH_ID = "test_data_source_plan_poc"


@pytest.fixture
def seeded_ids(client):
    """Return a valid use_case_id and task_id from seeded data."""
    paths = client.get("/api/paths").json()
    return {"use_case_id": paths[0]["use_case_id"], "task_id": paths[0]["task_id"]}


@pytest.fixture
def created_path(client, seeded_ids):
    """Create a test path and delete it after the test.

    Uses a direct DB delete before creation to avoid failures when a prior test
    left the same path ID in the database (e.g. because DELETE /api/paths is not
    yet implemented).
    """
    from api.db import engine  # import here to avoid circular imports at module level

    headers = {"X-Admin-Token": TEST_TOKEN}
    # Pre-cleanup: remove any leftover path from a previous test run
    with engine.connect() as conn:
        conn.execute(sql_text("DELETE FROM paths WHERE id = :id"), {"id": TEST_PATH_ID})
        conn.commit()

    response = client.post("/api/paths", json={
        "use_case_id": seeded_ids["use_case_id"],
        "task_id": seeded_ids["task_id"],
        "data_source_label": TEST_PATH_LABEL,
        "data_source_description": "Created by test suite",
        "task_description": "Test task description",
    }, headers=headers)
    assert response.status_code == 201, f"Fixture failed: {response.json()}"
    yield TEST_PATH_ID
    client.delete(f"/api/paths/{TEST_PATH_ID}", headers=headers)


def test_create_path(client, seeded_ids):
    from api.db import engine  # import here to avoid circular imports at module level

    headers = {"X-Admin-Token": TEST_TOKEN}
    # Pre-cleanup: ensure no leftover path from a prior session
    with engine.connect() as conn:
        conn.execute(sql_text("DELETE FROM paths WHERE id = :id"), {"id": TEST_PATH_ID})
        conn.commit()
    response = client.post("/api/paths", json={
        "use_case_id": seeded_ids["use_case_id"],
        "task_id": seeded_ids["task_id"],
        "data_source_label": TEST_PATH_LABEL,
        "data_source_description": "A test data source",
        "task_description": "A test task description",
    }, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == TEST_PATH_ID
    assert data["data_source_label"] == TEST_PATH_LABEL
    assert data["run_metric_ids"] == []
    assert data["aspects"] == []
    # Teardown: remove the created path (DELETE endpoint not yet implemented; direct SQL used)
    with engine.connect() as conn:
        conn.execute(sql_text("DELETE FROM paths WHERE id = :id"), {"id": TEST_PATH_ID})
        conn.commit()


def test_create_path_with_new_task(client, seeded_ids):
    from api.db import engine  # import here to avoid circular imports at module level

    headers = {"X-Admin-Token": TEST_TOKEN}
    new_path_id = "test_new_task_source_poc"
    # Pre-cleanup: ensure no leftover path from a prior session
    with engine.connect() as conn:
        conn.execute(sql_text("DELETE FROM paths WHERE id = :id"), {"id": new_path_id})
        conn.execute(sql_text("DELETE FROM tasks WHERE id = 'test_new_task_poc'"))
        conn.commit()
    response = client.post("/api/paths", json={
        "use_case_id": seeded_ids["use_case_id"],
        "task_label": "Test New Task PoC",
        "data_source_label": "Test New Task Source PoC",
    }, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["task_id"] == "test_new_task_poc"
    # Teardown: remove the created path and task (DELETE endpoint not yet implemented)
    with engine.connect() as conn:
        conn.execute(sql_text("DELETE FROM paths WHERE id = :id"), {"id": new_path_id})
        conn.execute(sql_text("DELETE FROM tasks WHERE id = 'test_new_task_poc'"))
        conn.commit()


def test_create_path_requires_auth(client, seeded_ids):
    response = client.post("/api/paths", json={
        "use_case_id": seeded_ids["use_case_id"],
        "task_id": seeded_ids["task_id"],
        "data_source_label": "No Auth Test",
    })
    assert response.status_code == 422


def test_create_path_duplicate_id_returns_409(client, seeded_ids, created_path):
    headers = {"X-Admin-Token": TEST_TOKEN}
    response = client.post("/api/paths", json={
        "use_case_id": seeded_ids["use_case_id"],
        "task_id": seeded_ids["task_id"],
        "data_source_label": TEST_PATH_LABEL,
    }, headers=headers)
    assert response.status_code == 409
