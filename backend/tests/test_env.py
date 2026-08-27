import os
from pathlib import Path

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
    """Importing `api` must populate os.environ before submodules read it."""
    import api  # noqa: F401  — import triggers load_environment()

    assert os.environ.get("ADMIN_TOKEN")
