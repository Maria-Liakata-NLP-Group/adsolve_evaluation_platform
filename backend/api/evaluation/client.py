"""The platform's outbound client to the metric calculation API.

This is the only module that knows the metric API exists. METRIC_API_TOKEN never
leaves the backend process — the frontend talks exclusively to this platform, which
is why the token can live in server-side configuration at all.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Optional

import httpx
from fastapi import Depends, HTTPException

REQUEST_TIMEOUT_SECONDS = 30.0
CALLBACK_PATH = "/api/evaluations/{job_id}/callback"


class NotConfigured(Exception):
    """The metric API connection details are missing from the environment."""


class MetricApiError(Exception):
    """The metric API refused a request or could not be reached.

    `status_code` is None when the failure was at the connection level, which is
    what lets the router distinguish "bad request" from "service unavailable".
    """

    def __init__(self, status_code: Optional[int], detail: Any) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"Metric API error ({status_code}): {detail}")


@dataclass(frozen=True)
class EvaluationSettings:
    base_url: str
    token: str
    callback_base_url: str

    def callback_url(self, job_id: str) -> str:
        """Where the metric API should POST this job's results."""
        return f"{self.callback_base_url}{CALLBACK_PATH.format(job_id=job_id)}"


def load_settings() -> EvaluationSettings:
    """Read connection details from the environment.

    Raises NotConfigured if any is missing, so an unconfigured deployment returns
    503 rather than silently accepting runs it cannot dispatch.
    """
    base_url = os.environ.get("METRIC_API_URL", "").strip()
    token = os.environ.get("METRIC_API_TOKEN", "").strip()
    callback_base_url = os.environ.get("PLATFORM_CALLBACK_URL", "").strip()

    missing = [
        name
        for name, value in (
            ("METRIC_API_URL", base_url),
            ("METRIC_API_TOKEN", token),
            ("PLATFORM_CALLBACK_URL", callback_base_url),
        )
        if not value
    ]
    if missing:
        raise NotConfigured(f"Missing configuration: {', '.join(missing)}")

    # Strip trailing slashes once here so no caller has to think about them.
    return EvaluationSettings(
        base_url=base_url.rstrip("/"),
        token=token,
        callback_base_url=callback_base_url.rstrip("/"),
    )


class MetricApiClient:
    """Thin HTTP wrapper over the metric API's four endpoints."""

    def __init__(
        self,
        base_url: str,
        token: str,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token
        self._http_client = http_client

    def list_metrics(self) -> list[dict[str, Any]]:
        """Every metric the service offers, with its availability flag."""
        return self._request("GET", "/metrics")

    def submit(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Queue an evaluation. Returns the API's {job_id, status}."""
        return self._request("POST", "/evaluations", json=payload)

    def get_job(self, metric_job_id: str) -> dict[str, Any]:
        """Current status and, once finished, results or error."""
        return self._request("GET", f"/evaluations/{metric_job_id}")

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        """Send one request, translating every failure into MetricApiError."""
        client = self._http_client or httpx.Client()
        try:
            response = client.request(
                method,
                f"{self.base_url}{path}",
                headers={"X-Api-Token": self.token},
                timeout=REQUEST_TIMEOUT_SECONDS,
                **kwargs,
            )
        except httpx.HTTPError as exc:
            raise MetricApiError(None, str(exc)) from exc
        finally:
            # Only close clients this method created; an injected one is the
            # caller's to manage.
            if self._http_client is None:
                client.close()

        if not response.is_success:
            raise MetricApiError(response.status_code, _detail_of(response))
        return response.json()


def get_settings() -> EvaluationSettings:
    """FastAPI dependency: connection details, or 503 if the platform has none."""
    try:
        return load_settings()
    except NotConfigured as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Metric calculation service is not configured. {exc}",
        ) from exc


def get_metric_client(
    settings: EvaluationSettings = Depends(get_settings),
) -> MetricApiClient:
    """FastAPI dependency: the client. Overridden in tests with a fake."""
    return MetricApiClient(settings.base_url, settings.token)


def _detail_of(response: httpx.Response) -> Any:
    """The API's error detail, falling back to raw text for non-JSON bodies."""
    try:
        return response.json().get("detail", response.text)
    except ValueError:
        return response.text
