"""GET /api/evaluations/metrics — what this platform can actually calculate.

The metric API offers metrics the platform catalog may not know, and the platform
lists many the API cannot compute. Only the intersection is offerable.
"""

import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from api.evaluation.client import MetricApiError, get_metric_client
from api.main import app
from tests.fakes import FakeMetricClient

TEST_TOKEN = "test-admin-token-abc123"
HEADERS = {"X-Admin-Token": TEST_TOKEN}

# `rouge` and `intra_nli` are in the platform catalog; the third is not.
API_METRICS = [
    {"id": "rouge", "label": "ROUGE", "requires": "gold", "available": True},
    {"id": "intra_nli", "label": "IntraNLI", "requires": None, "available": True},
    {"id": "not_in_platform", "label": "Nope", "requires": None, "available": True},
]


@pytest.fixture(autouse=True)
def admin_token() -> Iterator[None]:
    os.environ["ADMIN_TOKEN"] = TEST_TOKEN
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _use(fake: FakeMetricClient) -> FakeMetricClient:
    app.dependency_overrides[get_metric_client] = lambda: fake
    return fake


def test_lists_only_metrics_the_platform_can_ingest(client: TestClient) -> None:
    _use(FakeMetricClient(metrics=API_METRICS))
    response = client.get("/api/evaluations/metrics", headers=HEADERS)
    assert response.status_code == 200
    assert [m["id"] for m in response.json()] == ["rouge", "intra_nli"]


def test_preserves_the_reference_and_availability_flags(client: TestClient) -> None:
    """The frontend needs `requires` to know when gold summaries are mandatory."""
    _use(FakeMetricClient(metrics=API_METRICS))
    rouge = client.get("/api/evaluations/metrics", headers=HEADERS).json()[0]
    assert rouge["requires"] == "gold"
    assert rouge["available"] is True


def test_unreachable_api_returns_502(client: TestClient) -> None:
    _use(FakeMetricClient(error=MetricApiError(None, "connection refused")))
    assert client.get("/api/evaluations/metrics", headers=HEADERS).status_code == 502


def test_unconfigured_service_returns_503(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """With no METRIC_API_URL the frontend must be told why, not just get [].

    An empty list would read as "no metrics available" and silently disable
    calculating; a 503 carries the reason.
    """
    monkeypatch.delenv("METRIC_API_URL", raising=False)
    monkeypatch.setenv("METRIC_API_TOKEN", "metric-token")
    monkeypatch.setenv("PLATFORM_CALLBACK_URL", "http://platform.test")

    response = client.get("/api/evaluations/metrics", headers=HEADERS)
    assert response.status_code == 503
    assert "METRIC_API_URL" in response.json()["detail"]


def test_requires_the_admin_token(client: TestClient) -> None:
    _use(FakeMetricClient(metrics=API_METRICS))
    assert client.get("/api/evaluations/metrics").status_code == 422
