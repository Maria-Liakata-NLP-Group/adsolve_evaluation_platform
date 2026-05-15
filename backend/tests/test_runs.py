def test_get_runs(client):
    response = client.get("/api/runs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    run = data[0]
    for key in ("id", "path_id", "title", "datasets", "models"):
        assert key in run, f"missing key: {key}"


def test_get_run_by_path(client):
    response = client.get(
        "/api/runs/by-path/mental_health_summarisation_social_media_posts"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["path_id"] == "mental_health_summarisation_social_media_posts"
    assert "id" in data
    assert "title" in data


def test_get_run_by_path_not_found(client):
    response = client.get("/api/runs/by-path/nonexistent_path")
    assert response.status_code == 404


def test_get_dashboard_by_dataset(client):
    run_resp = client.get(
        "/api/runs/by-path/mental_health_summarisation_social_media_posts"
    )
    run_id = run_resp.json()["id"]
    dataset_id = run_resp.json()["datasets"][0]["id"]

    response = client.get(f"/api/runs/{run_id}/dashboard?dataset_id={dataset_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["run_id"] == run_id
    assert "datasets" in data
    assert "models" in data
    assert "metrics" in data
    assert "scores" in data
    assert len(data["scores"]) > 0
    score = data["scores"][0]
    for key in ("dataset_id", "model_id", "metric_id", "mean_score", "document_scores"):
        assert key in score, f"missing key: {key}"
    assert len(score["document_scores"]) > 0
    doc_score = score["document_scores"][0]
    assert "doc_id" in doc_score
    assert "score" in doc_score


def test_get_dashboard_by_model(client):
    run_resp = client.get(
        "/api/runs/by-path/mental_health_summarisation_social_media_posts"
    )
    run_id = run_resp.json()["id"]
    model_id = run_resp.json()["models"][0]["id"]

    response = client.get(f"/api/runs/{run_id}/dashboard?model_id={model_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["scores"]) > 0
