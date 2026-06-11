# Dockerize FastAPI Backend

**Date:** 2026-06-03
**Status:** Approved

## Goal

Containerize the FastAPI backend so it can be run locally via Docker and later deployed to Azure Container Apps.

## Scope

- FastAPI backend only (`backend/`)
- PostgreSQL is **not** containerized; it runs separately and is reached via `DATABASE_URL`
- No docker-compose needed

## Files to Create

All files live inside `backend/`:

| File | Purpose |
|---|---|
| `Dockerfile` | Container definition |
| `.dockerignore` | Excludes unnecessary files from the build context |
| `.env.example` | Documents required environment variables |

## Dockerfile Design

- **Base image:** `python:3.12-slim` — small, well-supported, compatible with `psycopg2-binary`
- **Working directory:** `/app`
- **Layer caching:** `requirements.txt` is copied and installed before the app source, so dependency install is skipped on code-only changes
- **No root user risk:** dependencies installed into system site-packages (acceptable for a single-purpose container)
- **Port:** `8005`
- **Entrypoint:** `uvicorn api.main:app --host 0.0.0.0 --port 8005`

## .dockerignore

Excludes from the build context:
- `.venv/` — never needed inside the container
- `__pycache__/`, `*.pyc` — build artifacts
- `evaluation_bundles/`, `legacy_data/` — data files not needed at runtime
- `tests/` — not needed in production image
- `.env`, `.env.*` — secrets must not be baked into the image
- `.git/`, `.pytest_cache/`

## Environment Variables

| Variable | Required | Example |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql+psycopg2://user:pass@host:5432/adsolve` |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173` (empty = no CORS middleware) |

These are passed at runtime via `-e` flags or Azure Container Apps environment variable configuration.

## Local Usage

```bash
# Build
docker build -t adsolve-backend ./backend

# Run
docker run -p 8005:8005 \
  -e DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/adsolve \
  -e ALLOWED_ORIGINS=http://localhost:5173 \
  adsolve-backend
```

API is then available at `http://localhost:8005`.

## Azure Container Apps Path

When deploying later:
1. Push image to Azure Container Registry (ACR)
2. Create Container App pointing to the ACR image
3. Set `DATABASE_URL` and `ALLOWED_ORIGINS` as Container App environment variables (use secrets for the DB URL)
4. Container Apps handles HTTPS termination — uvicorn runs plain HTTP inside the container

## Out of Scope

- `migrate.py` — legacy, will be moved out of backend later; not included in the container
- docker-compose — not needed since only the backend is containerized
- Multi-stage build — unnecessary for a pure-Python app; slim base achieves adequate image size
