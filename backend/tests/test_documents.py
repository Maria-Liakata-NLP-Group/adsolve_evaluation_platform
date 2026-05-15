def test_get_documents(client):
    run_resp = client.get(
        "/api/runs/by-path/mental_health_summarisation_social_media_posts"
    )
    run_id = run_resp.json()["id"]
    dataset_id = run_resp.json()["datasets"][0]["id"]

    response = client.get(f"/api/runs/{run_id}/documents?dataset_id={dataset_id}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    doc = data[0]
    for key in ("doc_id", "external_id", "gold_summary"):
        assert key in doc, f"missing key: {key}"


def test_get_document_detail(client):
    run_resp = client.get(
        "/api/runs/by-path/mental_health_summarisation_social_media_posts"
    )
    run_id = run_resp.json()["id"]
    dataset_id = run_resp.json()["datasets"][0]["id"]

    docs_resp = client.get(f"/api/runs/{run_id}/documents?dataset_id={dataset_id}")
    doc_id = docs_resp.json()[0]["doc_id"]

    response = client.get(f"/api/runs/{run_id}/documents/{doc_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["doc_id"] == doc_id
    assert "external_id" in data
    assert "gold_summary" in data
    assert "outputs" in data
    assert len(data["outputs"]) > 0
    output = data["outputs"][0]
    assert "model" in output
    assert "llm_summary" in output
    assert "scores" in output


def test_get_document_not_found(client):
    response = client.get("/api/runs/1/documents/999999")
    assert response.status_code == 404
