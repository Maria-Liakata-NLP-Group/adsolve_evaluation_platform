"""The outbound client to the metric calculation API.

Requests go through a real httpx transport with a stub responder, so the client's
own request building and error mapping are exercised rather than mocked away.
"""

import httpx
import pytest

from api.evaluation.client import (
    MetricApiClient,
    MetricApiError,
    NotConfigured,
    load_settings,
)

BASE_URL = "http://metrics.test"
TOKEN = "metric-token-xyz"


def _client(responder) -> MetricApiClient:
    """A client whose requests are answered by `responder` instead of the network."""
    transport = httpx.MockTransport(responder)
    return MetricApiClient(
        BASE_URL, TOKEN, http_client=httpx.Client(transport=transport)
    )


def test_submit_returns_the_job_id_the_api_assigned() -> None:
    def responder(request: httpx.Request) -> httpx.Response:
        return httpx.Response(202, json={"job_id": "api-uuid", "status": "queued"})

    assert _client(responder).submit({"name": "run"})["job_id"] == "api-uuid"


def test_every_request_carries_the_api_token() -> None:
    seen: dict[str, str] = {}

    def responder(request: httpx.Request) -> httpx.Response:
        seen["token"] = request.headers.get("x-api-token", "")
        return httpx.Response(200, json=[])

    _client(responder).list_metrics()
    assert seen["token"] == TOKEN


def test_submit_posts_to_the_evaluations_endpoint() -> None:
    seen: dict[str, str] = {}

    def responder(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["method"] = request.method
        return httpx.Response(202, json={"job_id": "api-uuid"})

    _client(responder).submit({"name": "run"})
    assert seen["method"] == "POST"
    assert seen["url"] == f"{BASE_URL}/evaluations"


def test_get_job_reads_the_job_by_id() -> None:
    def responder(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == f"{BASE_URL}/evaluations/api-uuid"
        return httpx.Response(200, json={"status": "running"})

    assert _client(responder).get_job("api-uuid")["status"] == "running"


def test_validation_failure_keeps_the_status_code_and_detail() -> None:
    """422s carry the API's full error list, which the router passes through."""

    def responder(request: httpx.Request) -> httpx.Response:
        return httpx.Response(422, json={"detail": ["Unknown metric ids: nope"]})

    with pytest.raises(MetricApiError) as exc:
        _client(responder).submit({"name": "run"})
    assert exc.value.status_code == 422
    assert exc.value.detail == ["Unknown metric ids: nope"]


def test_server_error_is_raised_as_a_metric_api_error() -> None:
    def responder(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="boom")

    with pytest.raises(MetricApiError) as exc:
        _client(responder).submit({"name": "run"})
    assert exc.value.status_code == 500


def test_unreachable_service_is_raised_as_a_metric_api_error() -> None:
    """A connection failure must not surface as a bare httpx exception."""

    def responder(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("no route to host")

    with pytest.raises(MetricApiError) as exc:
        _client(responder).list_metrics()
    assert exc.value.status_code is None


def test_settings_load_from_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("METRIC_API_URL", "http://metrics.test/")
    monkeypatch.setenv("METRIC_API_TOKEN", TOKEN)
    monkeypatch.setenv("PLATFORM_CALLBACK_URL", "http://platform.test/")

    settings = load_settings()

    # Trailing slashes are stripped so URL building never doubles them up.
    assert settings.base_url == "http://metrics.test"
    assert settings.token == TOKEN
    assert settings.callback_base_url == "http://platform.test"


def test_missing_configuration_raises_not_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Unset config must fail loudly rather than half-working."""
    monkeypatch.delenv("METRIC_API_URL", raising=False)
    monkeypatch.setenv("METRIC_API_TOKEN", TOKEN)
    monkeypatch.setenv("PLATFORM_CALLBACK_URL", "http://platform.test")

    with pytest.raises(NotConfigured):
        load_settings()


def test_callback_url_embeds_the_platform_job_id(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("METRIC_API_URL", "http://metrics.test")
    monkeypatch.setenv("METRIC_API_TOKEN", TOKEN)
    monkeypatch.setenv("PLATFORM_CALLBACK_URL", "http://platform.test")

    assert load_settings().callback_url("job-7") == (
        "http://platform.test/api/evaluations/job-7/callback"
    )
