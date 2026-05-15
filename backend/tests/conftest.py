import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.fixture(scope="session")
def client():
    """Provide a test client for the FastAPI app, shared across the test session."""
    return TestClient(app)
