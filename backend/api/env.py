"""Loads the backend's .env file into the process environment."""

from pathlib import Path

from dotenv import load_dotenv

# backend/.env — one directory above this `api` package.
DEFAULT_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


def load_environment(env_path: Path = DEFAULT_ENV_PATH) -> None:
    """Read KEY=VALUE pairs from the given .env file into os.environ.

    Variables already present in the environment are left untouched, so real
    env vars (Docker, CI, an already-sourced shell) take precedence over the
    file. A missing file is not an error — deployments may inject env vars
    directly instead.
    """
    load_dotenv(env_path, override=False)
