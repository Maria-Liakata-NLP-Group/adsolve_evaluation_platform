# Dockerize Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the FastAPI backend into a Docker image that runs on port 8005 and can be deployed to Azure Container Apps.

**Architecture:** A single-stage `python:3.12-slim` Dockerfile installs dependencies from `requirements.txt`, copies the `api/` source, and starts uvicorn on port 8005. Environment variables (`DATABASE_URL`, `ALLOWED_ORIGINS`) are passed at runtime — never baked into the image.

**Tech Stack:** Docker, Python 3.12-slim, FastAPI, uvicorn

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `backend/.dockerignore` | Exclude venv, cache, data files from build context |
| Create | `backend/Dockerfile` | Container definition |
| Create | `backend/.env.example` | Documents required env vars for developers |

---

### Task 1: Create `.dockerignore`

**Files:**
- Create: `backend/.dockerignore`

- [ ] **Step 1: Create the file**

```
# Python
__pycache__/
*.py[cod]
*.pyo

# Virtual environment — never copy into the container
.venv/
venv/
env/

# Secrets — must never be baked into the image
.env
.env.*

# Data files not needed at runtime
evaluation_bundles/
legacy_data/

# Test and dev artifacts
tests/
.pytest_cache/

# Git and IDE
.git/
.DS_Store
```

Save as `backend/.dockerignore`.

- [ ] **Step 2: Verify the file is in the right place**

```bash
cat backend/.dockerignore
```

Expected: file contents printed, no error.

- [ ] **Step 3: Commit**

```bash
git add backend/.dockerignore
git commit -m "chore: add .dockerignore for backend"
```

---

### Task 2: Create `Dockerfile`

**Files:**
- Create: `backend/Dockerfile`

- [ ] **Step 1: Create the Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first so this layer is cached on code-only changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY api/ ./api/

EXPOSE 8005

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8005"]
```

Save as `backend/Dockerfile`.

- [ ] **Step 2: Commit**

```bash
git add backend/Dockerfile
git commit -m "chore: add Dockerfile for backend"
```

---

### Task 3: Create `.env.example`

**Files:**
- Create: `backend/.env.example`

- [ ] **Step 1: Create the file**

```bash
# Required: connection string for PostgreSQL
DATABASE_URL=postgresql+psycopg2://user:password@host:5432/adsolve

# Optional: comma-separated allowed origins for CORS (leave empty to disable CORS middleware)
ALLOWED_ORIGINS=http://localhost:5173
```

Save as `backend/.env.example`.

- [ ] **Step 2: Commit**

```bash
git add backend/.env.example
git commit -m "chore: add .env.example documenting backend env vars"
```

---

### Task 4: Build and smoke-test the image

This task verifies the image builds and the app starts correctly. No running PostgreSQL is needed — we just confirm uvicorn comes up and responds.

- [ ] **Step 1: Build the image**

Run from the repo root:

```bash
docker build -t adsolve-backend ./backend
```

Expected output ends with:
```
Successfully built <hash>
Successfully tagged adsolve-backend:latest
```

If the build fails on a dependency install, check that `requirements.txt` lists `uvicorn[standard]` (with the extras bracket). The Dockerfile copies `requirements.txt` from `backend/` — confirm you ran the build from the repo root (`./backend` context).

- [ ] **Step 2: Start the container without a database**

```bash
docker run --rm -p 8005:8005 \
  -e DATABASE_URL=postgresql+psycopg2://noop:noop@localhost:5432/noop \
  -e ALLOWED_ORIGINS=http://localhost:5173 \
  adsolve-backend
```

Expected: uvicorn starts and logs:

```
INFO:     Started server process [1]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8005 (Press CTRL+C to quit)
```

The app may log a database connection error when a request arrives — that is expected since there is no real PostgreSQL. What matters is that uvicorn starts successfully.

- [ ] **Step 3: Verify the API docs endpoint responds**

In a separate terminal while the container is running:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8005/docs
```

Expected: `200`

- [ ] **Step 4: Stop the container**

Press `Ctrl+C` in the container terminal.

- [ ] **Step 5: Commit a note if anything needed fixing**

If steps 1–4 all passed without changes, no commit needed. If you had to fix the Dockerfile or requirements, commit those fixes now:

```bash
git add backend/Dockerfile backend/requirements.txt
git commit -m "fix: correct Dockerfile after smoke test"
```
