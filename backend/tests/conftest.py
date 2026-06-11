import os

import pytest
from fastapi.testclient import TestClient

from api.main import app

TEST_ADMIN_TOKEN = "test-admin-token-abc123"


@pytest.fixture(scope="session", autouse=True)
def set_admin_token():
    """Set ADMIN_TOKEN env var for the entire test session."""
    os.environ["ADMIN_TOKEN"] = TEST_ADMIN_TOKEN
    yield
    # Clean up after session
    os.environ.pop("ADMIN_TOKEN", None)


@pytest.fixture(scope="session")
def client():
    """Provide a test client for the FastAPI app, shared across the test session."""
    return TestClient(app)
