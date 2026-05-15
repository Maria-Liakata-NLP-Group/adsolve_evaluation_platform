def test_get_use_cases(client):
    response = client.get("/api/use-cases")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    ids = [d["id"] for d in data]
    assert "mental_health" in ids
    assert "legal_support" in ids
    assert "medical_diagnostics" in ids
    assert all("label" in d for d in data)


def test_get_paths(client):
    response = client.get("/api/paths")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    path = data[0]
    for key in ("id", "use_case_id", "task_id", "data_source_id",
                "data_source_label", "use_case_label", "task_label"):
        assert key in path, f"missing key: {key}"


def test_get_paths_filtered_by_use_case(client):
    response = client.get("/api/paths?use_case_id=mental_health")
    assert response.status_code == 200
    data = response.json()
    assert all(p["use_case_id"] == "mental_health" for p in data)


def test_get_path_detail(client):
    response = client.get("/api/paths/mental_health_summarisation_social_media_posts")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "mental_health_summarisation_social_media_posts"
    assert "aspects" in data
    assert len(data["aspects"]) > 0
    aspect = data["aspects"][0]
    for key in ("id", "label", "definition", "sort_order", "metrics"):
        assert key in aspect, f"missing key: {key}"
    metric = aspect["metrics"][0]
    for key in ("id", "label", "supported_compute_environments", "supported_reference_modes"):
        assert key in metric, f"missing metric key: {key}"


def test_get_path_detail_not_found(client):
    response = client.get("/api/paths/nonexistent_path")
    assert response.status_code == 404


def test_get_infrastructure(client):
    response = client.get("/api/infrastructure")
    assert response.status_code == 200
    data = response.json()
    assert "compute_environment" in data
    assert "reference_mode" in data
    assert data["compute_environment"]["label"] == "Compute environment"
    ce_ids = [o["id"] for o in data["compute_environment"]["options"]]
    assert "cpu_only" in ce_ids
    assert "gpu_available" in ce_ids
    assert "cloud_inference" in ce_ids
