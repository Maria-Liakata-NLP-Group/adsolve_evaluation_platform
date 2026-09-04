"""Test doubles shared by the evaluation endpoint tests."""

from __future__ import annotations

from typing import Any, Optional

from api.evaluation.client import MetricApiError


class FakeMetricClient:
    """Stands in for MetricApiClient so tests need no network and no GPU.

    Records what it was asked to send, so tests can assert on the request the
    platform builds rather than on the fake itself.
    """

    def __init__(
        self,
        submit_response: Optional[dict[str, Any]] = None,
        job_response: Optional[dict[str, Any]] = None,
        metrics: Optional[list[dict[str, Any]]] = None,
        error: Optional[MetricApiError] = None,
    ) -> None:
        self.submit_response = submit_response or {"job_id": "api-uuid", "status": "queued"}
        self.job_response = job_response or {"status": "running"}
        self.metrics = metrics or []
        self.error = error
        self.submitted: list[dict[str, Any]] = []
        self.jobs_polled: list[str] = []

    def submit(self, payload: dict[str, Any]) -> dict[str, Any]:
        if self.error:
            raise self.error
        self.submitted.append(payload)
        return self.submit_response

    def get_job(self, metric_job_id: str) -> dict[str, Any]:
        if self.error:
            raise self.error
        self.jobs_polled.append(metric_job_id)
        return self.job_response

    def list_metrics(self) -> list[dict[str, Any]]:
        if self.error:
            raise self.error
        return self.metrics
