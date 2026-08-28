import os
import subprocess
import sys
from pathlib import Path

import pytest

from api.env import load_environment

TEST_VAR = "ADSOLVE_TEST_TOKEN"


def test_load_environment_strips_export_prefix(tmp_path: Path) -> None:
    """The project's .env uses `export KEY=value`, so the prefix must be stripped."""
    env_file = tmp_path / ".env"
    env_file.write_text(f"export {TEST_VAR}=secret-123\n")
    os.environ.pop(TEST_VAR, None)

    load_environment(env_file)

    assert os.environ[TEST_VAR] == "secret-123"
    os.environ.pop(TEST_VAR, None)


def test_load_environment_keeps_existing_variables(tmp_path: Path) -> None:
    """Real environment variables (Docker, CI) win over values in the file."""
    env_file = tmp_path / ".env"
    env_file.write_text(f"export {TEST_VAR}=from-file\n")
    os.environ[TEST_VAR] = "from-environment"

    load_environment(env_file)

    assert os.environ[TEST_VAR] == "from-environment"
    os.environ.pop(TEST_VAR, None)


def test_load_environment_ignores_missing_file(tmp_path: Path) -> None:
    """A missing .env is normal in deployments that inject real env vars."""
    load_environment(tmp_path / "does-not-exist.env")


def test_importing_api_package_loads_the_env_file() -> None:
    """A scrubbed subprocess proves api/__init__.py is what populates os.environ.

    Asserting on this process's os.environ cannot fail: conftest.py sets
    ADMIN_TOKEN in a session-scoped autouse fixture that runs first.
    """
    backend_dir = Path(__file__).resolve().parent.parent
    if not (backend_dir / ".env").exists():
        pytest.skip("backend/.env is absent; nothing for api/__init__.py to load")

    result = subprocess.run(
        [sys.executable, "-c", "import api, os; print(os.environ.get('ADMIN_TOKEN', ''))"],
        cwd=backend_dir,
        env={"PATH": os.environ.get("PATH", "")},
        capture_output=True,
        text=True,
        check=True,
    )

    assert result.stdout.strip(), (
        "api/__init__.py did not load ADMIN_TOKEN from backend/.env "
        f"(stderr: {result.stderr})"
    )
