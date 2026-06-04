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
