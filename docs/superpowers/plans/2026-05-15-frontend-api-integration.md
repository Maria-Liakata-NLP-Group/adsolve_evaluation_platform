# Frontend API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all static local data imports in the React frontend with calls to a FastAPI backend, leaving no JSON or YAML data files in `frontend/src/data/`.

**Architecture:** A FastAPI app in `backend/api/` serves 9 REST endpoints from PostgreSQL via SQLAlchemy text queries. A thin `frontend/src/api/` service layer wraps all `fetch()` calls. Pages replace static imports with API calls. A `usePathConfig()` hook manages async config loading for the script builder. `MetricsScatterPlot` stops pre-loading document text — it is fetched lazily on point click.

**Tech Stack:** FastAPI, Pydantic v2, SQLAlchemy (text queries), uvicorn, pytest + httpx (TestClient); React, Vite dev proxy

---

## File Map

**Backend — Create:**
- `backend/api/__init__.py` — empty package marker
- `backend/api/main.py` — FastAPI app, CORS, router mounting
- `backend/api/db.py` — SQLAlchemy engine + `get_db()` session dependency
- `backend/api/routers/__init__.py` — empty
- `backend/api/routers/config.py` — `/api/use-cases`, `/api/paths`, `/api/paths/{path_id}`, `/api/infrastructure`
- `backend/api/routers/runs.py` — `/api/runs`, `/api/runs/by-path/{path_id}`, `/api/runs/{run_id}/dashboard`
- `backend/api/routers/documents.py` — `/api/runs/{run_id}/documents`, `/api/runs/{run_id}/documents/{doc_id}`
- `backend/api/schemas/__init__.py` — empty
- `backend/api/schemas/config.py` — Pydantic models for config domain
- `backend/api/schemas/runs.py` — Pydantic models for runs/results domain
- `backend/tests/__init__.py` — empty
- `backend/tests/conftest.py` — shared `TestClient` fixture
- `backend/tests/test_config.py` — integration tests for config endpoints
- `backend/tests/test_runs.py` — integration tests for runs endpoints
- `backend/tests/test_documents.py` — integration tests for documents endpoints

**Backend — Modify:**
- `backend/requirements.txt` — add `fastapi`, `uvicorn[standard]`, `httpx`

**Frontend — Create:**
- `frontend/src/api/client.js` — base `get()` wrapper with `ApiError`
- `frontend/src/api/config.js` — `getUseCases()`, `getPaths()`, `getPath()`, `getInfrastructure()`
- `frontend/src/api/runs.js` — `getRunByPath()`, `getDashboard()`, `getDocuments()`, `getDocument()`
- `frontend/src/hooks/usePathConfig.js` — hook calling config API on mount

**Frontend — Modify:**
- `frontend/vite.config.js` — add `/api` proxy to `http://localhost:8000`
- `frontend/src/App.jsx` — add `/use-cases/tasks/:pathId` route for Dashboard
- `frontend/src/pages/useCases.jsx` — call `getUseCases()`, navigate to `/:useCaseId`
- `frontend/src/pages/useCaseExamples.jsx` — call `getPaths()` + `getRunByPath()`, navigate to `/tasks/:pathId`
- `frontend/src/pages/dashboard.jsx` — read `pathId` param, call API, fetch document on click
- `frontend/src/pages/createNew.jsx` — remove static imports, use `usePathConfig()` hook
- `frontend/src/components/metricsScatterPlot.jsx` — remove document content props

**Frontend — Delete (Task 13):**
- `frontend/src/data/UseCases.json`
- `frontend/src/data/ai-for-mental-health/summarise-social-media-threads.json`
- `frontend/src/data/ai-legal-support/summarise-supreme-court-cases.json`
- `frontend/src/data/multi-modal-medical-diagnostics-and-monitoring/multimodal_chest-xray_report_generation.json`
- `frontend/src/data/createTask.json`
- `frontend/src/data/evalConfig.js`
- `frontend/src/data/script_builder/` (all files)
- `frontend/src/utils/loadJsonFolder.jsx`

---

## Task 1: Backend Scaffold

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/api/__init__.py`, `backend/api/routers/__init__.py`, `backend/api/schemas/__init__.py`
- Create: `backend/api/db.py`
- Create: `backend/api/main.py` (with stub routers)
- Create: `backend/tests/__init__.py`, `backend/tests/conftest.py`

- [ ] **Step 1: Update `backend/requirements.txt`**

```
py-readability-metrics
pandas
SQLAlchemy
psycopg2-binary
PyYAML
fastapi
uvicorn[standard]
httpx
```

- [ ] **Step 2: Install new dependencies**

```bash
cd backend
pip install -r requirements.txt
```

Expected: completes without errors.

- [ ] **Step 3: Create empty package markers**

Create three empty files:
- `backend/api/__init__.py`
- `backend/api/routers/__init__.py`
- `backend/api/schemas/__init__.py`
- `backend/tests/__init__.py`

- [ ] **Step 4: Create `backend/api/db.py`**

```python
import getpass
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


def _database_url() -> str:
    default_user = getpass.getuser()
    return os.environ.get(
        "DATABASE_URL",
        f"postgresql+psycopg2://{default_user}@localhost:5432/adsolve",
    )


engine = create_engine(_database_url())
_SessionLocal = sessionmaker(bind=engine)


def get_db() -> Session:
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 5: Create stub routers (required for `main.py` import)**

`backend/api/routers/config.py`:
```python
from fastapi import APIRouter

router = APIRouter(prefix="/api")
```

`backend/api/routers/runs.py`:
```python
from fastapi import APIRouter

router = APIRouter(prefix="/api")
```

`backend/api/routers/documents.py`:
```python
from fastapi import APIRouter

router = APIRouter(prefix="/api")
```

- [ ] **Step 6: Create `backend/api/main.py`**

```python
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import config, documents, runs

app = FastAPI(title="AdSoLve Evaluation API")

_origins = [o for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o]
if _origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_methods=["GET"],
        allow_headers=["*"],
    )

app.include_router(config.router)
app.include_router(runs.router)
app.include_router(documents.router)
```

- [ ] **Step 7: Create `backend/tests/conftest.py`**

```python
import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.fixture(scope="session")
def client():
    return TestClient(app)
```

- [ ] **Step 8: Verify the app starts**

```bash
cd backend
uvicorn api.main:app --reload &
sleep 2
curl http://localhost:8000/docs | grep -o "AdSoLve"
kill %1
```

Expected: `AdSoLve` printed (confirming Swagger UI loads).

- [ ] **Step 9: Commit**

```bash
git add backend/requirements.txt backend/api/ backend/tests/
git commit -m "feat: scaffold FastAPI app with db dependency and stub routers"
```

---

## Task 2: Config Schemas and Router

**Files:**
- Create: `backend/api/schemas/config.py`
- Modify: `backend/api/routers/config.py`
- Create: `backend/tests/test_config.py`

Note: `/api/infrastructure` returns a hardcoded response because the infrastructure option labels (e.g. "CPU only (no GPU)") are not stored in the database.

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_config.py`:

```python
def test_get_use_cases(client):
    response = client.get("/api/use-cases")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    ids = [d["id"] for d in data]
    assert "mental_health" in ids
    assert "legal_support" in ids
    assert "medical_diagnostics" in ids
    assert all("label" in d for d in data)


def test_get_paths(client):
    response = client.get("/api/paths")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    path = data[0]
    for key in ("id", "use_case_id", "task_id", "data_source_id",
                "data_source_label", "use_case_label", "task_label"):
        assert key in path, f"missing key: {key}"


def test_get_paths_filtered_by_use_case(client):
    response = client.get("/api/paths?use_case_id=mental_health")
    assert response.status_code == 200
    data = response.json()
    assert all(p["use_case_id"] == "mental_health" for p in data)


def test_get_path_detail(client):
    response = client.get("/api/paths/mental_health_summarisation_social_media_posts")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "mental_health_summarisation_social_media_posts"
    assert "aspects" in data
    assert len(data["aspects"]) > 0
    aspect = data["aspects"][0]
    for key in ("id", "label", "definition", "sort_order", "metrics"):
        assert key in aspect, f"missing key: {key}"
    metric = aspect["metrics"][0]
    for key in ("id", "label", "supported_compute_environments", "supported_reference_modes"):
        assert key in metric, f"missing metric key: {key}"


def test_get_path_detail_not_found(client):
    response = client.get("/api/paths/nonexistent_path")
    assert response.status_code == 404


def test_get_infrastructure(client):
    response = client.get("/api/infrastructure")
    assert response.status_code == 200
    data = response.json()
    assert "compute_environment" in data
    assert "reference_mode" in data
    assert data["compute_environment"]["label"] == "Compute environment"
    ce_ids = [o["id"] for o in data["compute_environment"]["options"]]
    assert "cpu_only" in ce_ids
    assert "gpu_available" in ce_ids
    assert "cloud_inference" in ce_ids
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd backend
pytest tests/test_config.py -v
```

Expected: all tests fail (endpoints return 404 — routers are stubs).

- [ ] **Step 3: Create `backend/api/schemas/config.py`**

```python
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class UseCaseSchema(BaseModel):
    id: str
    label: str
    description: Optional[str] = None


class PathSummary(BaseModel):
    id: str
    use_case_id: str
    task_id: str
    data_source_id: str
    data_source_label: str
    use_case_label: str
    task_label: str


class InfraOption(BaseModel):
    id: str
    label: str


class InfraGroup(BaseModel):
    label: str
    options: list[InfraOption]


class InfrastructureSchema(BaseModel):
    compute_environment: InfraGroup
    reference_mode: InfraGroup


class MetricSchema(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    tags: list[str] = []
    supported_compute_environments: list[str] = []
    supported_reference_modes: list[str] = []


class PathAspect(BaseModel):
    id: str
    label: str
    definition: Optional[str] = None
    sort_order: int = 0
    examples: Optional[Any] = None
    stakeholder_requirements: Optional[Any] = None
    metrics: list[MetricSchema] = []


class PathDetail(BaseModel):
    id: str
    use_case_id: str
    task_id: str
    data_source_id: str
    data_source_label: str
    data_source_description: Optional[str] = None
    aspects: list[PathAspect] = []
```

- [ ] **Step 4: Implement `backend/api/routers/config.py`**

```python
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas.config import (
    InfraGroup,
    InfraOption,
    InfrastructureSchema,
    MetricSchema,
    PathAspect,
    PathDetail,
    PathSummary,
    UseCaseSchema,
)

router = APIRouter(prefix="/api")

_INFRASTRUCTURE = InfrastructureSchema(
    compute_environment=InfraGroup(
        label="Compute environment",
        options=[
            InfraOption(id="cpu_only", label="CPU only (no GPU)"),
            InfraOption(id="gpu_available", label="GPU available"),
            InfraOption(id="cloud_inference", label="Cloud Inference"),
        ],
    ),
    reference_mode=InfraGroup(
        label="References",
        options=[
            InfraOption(id="reference_free", label="Reference free"),
            InfraOption(id="reference_based", label="Reference based"),
        ],
    ),
)


@router.get("/use-cases", response_model=list[UseCaseSchema])
def get_use_cases(db: Session = Depends(get_db)):
    rows = db.execute(
        text("SELECT id, label, description FROM use_cases ORDER BY id")
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/paths", response_model=list[PathSummary])
def get_paths(use_case_id: Optional[str] = None, db: Session = Depends(get_db)):
    sql = """
        SELECT p.id, p.use_case_id, p.task_id, p.data_source_id, p.data_source_label,
               uc.label AS use_case_label, t.label AS task_label
        FROM   paths p
        JOIN   use_cases uc ON uc.id = p.use_case_id
        JOIN   tasks t      ON t.id  = p.task_id
        WHERE  (CAST(:use_case_id AS TEXT) IS NULL OR p.use_case_id = :use_case_id)
        ORDER  BY p.id
    """
    rows = db.execute(text(sql), {"use_case_id": use_case_id}).mappings().all()
    return [dict(r) for r in rows]


@router.get("/paths/{path_id}", response_model=PathDetail)
def get_path(path_id: str, db: Session = Depends(get_db)):
    path_row = db.execute(
        text("""
            SELECT p.id, p.use_case_id, p.task_id, p.data_source_id,
                   p.data_source_label, p.data_source_description
            FROM   paths p
            WHERE  p.id = :path_id
        """),
        {"path_id": path_id},
    ).mappings().one_or_none()

    if path_row is None:
        raise HTTPException(status_code=404, detail="Path not found")

    aspect_rows = db.execute(
        text("""
            SELECT pa.id AS path_aspect_id, a.id AS aspect_id, a.label,
                   pa.definition, pa.sort_order, pa.examples, pa.stakeholder_requirements
            FROM   path_aspects pa
            JOIN   aspects a ON a.id = pa.aspect_id
            WHERE  pa.path_id = :path_id
            ORDER  BY pa.sort_order
        """),
        {"path_id": path_id},
    ).mappings().all()

    metric_rows = db.execute(
        text("""
            SELECT pam.path_aspect_id, m.id, m.label, m.description, m.tags,
                   m.supported_compute_environments, m.supported_reference_modes
            FROM   path_aspect_metrics pam
            JOIN   metrics m ON m.id = pam.metric_id
            WHERE  pam.path_aspect_id IN (
                SELECT id FROM path_aspects WHERE path_id = :path_id
            )
            ORDER  BY pam.path_aspect_id, m.id
        """),
        {"path_id": path_id},
    ).mappings().all()

    metrics_by_aspect: dict[int, list[MetricSchema]] = {}
    for mr in metric_rows:
        pa_id = mr["path_aspect_id"]
        metrics_by_aspect.setdefault(pa_id, []).append(
            MetricSchema(
                id=mr["id"],
                label=mr["label"],
                description=mr["description"],
                tags=list(mr["tags"] or []),
                supported_compute_environments=list(mr["supported_compute_environments"] or []),
                supported_reference_modes=list(mr["supported_reference_modes"] or []),
            )
        )

    aspects = [
        PathAspect(
            id=ar["aspect_id"],
            label=ar["label"],
            definition=ar["definition"],
            sort_order=ar["sort_order"],
            examples=ar["examples"],
            stakeholder_requirements=ar["stakeholder_requirements"],
            metrics=metrics_by_aspect.get(ar["path_aspect_id"], []),
        )
        for ar in aspect_rows
    ]

    return PathDetail(
        id=path_row["id"],
        use_case_id=path_row["use_case_id"],
        task_id=path_row["task_id"],
        data_source_id=path_row["data_source_id"],
        data_source_label=path_row["data_source_label"],
        data_source_description=path_row["data_source_description"],
        aspects=aspects,
    )


@router.get("/infrastructure", response_model=InfrastructureSchema)
def get_infrastructure():
    return _INFRASTRUCTURE
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
cd backend
pytest tests/test_config.py -v
```

Expected: all 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/api/schemas/config.py backend/api/routers/config.py backend/tests/test_config.py
git commit -m "feat: add config endpoints (use-cases, paths, infrastructure)"
```

---

## Task 3: Runs Schemas and Router

**Files:**
- Create: `backend/api/schemas/runs.py`
- Modify: `backend/api/routers/runs.py`
- Create: `backend/tests/test_runs.py`

Note: The `document_scores` field in the dashboard response extends the spec shape to include `doc_id` alongside each score — the frontend needs doc IDs to fetch document detail on click.

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_runs.py`:

```python
def test_get_runs(client):
    response = client.get("/api/runs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    run = data[0]
    for key in ("id", "path_id", "title", "datasets", "models"):
        assert key in run, f"missing key: {key}"


def test_get_run_by_path(client):
    response = client.get(
        "/api/runs/by-path/mental_health_summarisation_social_media_posts"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["path_id"] == "mental_health_summarisation_social_media_posts"
    assert "id" in data
    assert "title" in data


def test_get_run_by_path_not_found(client):
    response = client.get("/api/runs/by-path/nonexistent_path")
    assert response.status_code == 404


def test_get_dashboard_by_dataset(client):
    run_resp = client.get(
        "/api/runs/by-path/mental_health_summarisation_social_media_posts"
    )
    run_id = run_resp.json()["id"]
    dataset_id = run_resp.json()["datasets"][0]["id"]

    response = client.get(f"/api/runs/{run_id}/dashboard?dataset_id={dataset_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["run_id"] == run_id
    assert "datasets" in data
    assert "models" in data
    assert "metrics" in data
    assert "scores" in data
    assert len(data["scores"]) > 0
    score = data["scores"][0]
    for key in ("dataset_id", "model_id", "metric_id", "mean_score", "document_scores"):
        assert key in score, f"missing key: {key}"
    assert len(score["document_scores"]) > 0
    doc_score = score["document_scores"][0]
    assert "doc_id" in doc_score
    assert "score" in doc_score


def test_get_dashboard_by_model(client):
    run_resp = client.get(
        "/api/runs/by-path/mental_health_summarisation_social_media_posts"
    )
    run_id = run_resp.json()["id"]
    model_id = run_resp.json()["models"][0]["id"]

    response = client.get(f"/api/runs/{run_id}/dashboard?model_id={model_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["scores"]) > 0
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd backend
pytest tests/test_runs.py -v
```

Expected: all tests fail.

- [ ] **Step 3: Create `backend/api/schemas/runs.py`**

```python
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class DatasetRef(BaseModel):
    id: int
    name: str


class ModelRef(BaseModel):
    id: int
    name: str


class MetricRef(BaseModel):
    metric_id: str
    display_label: str


class RunSummary(BaseModel):
    id: int
    path_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    datasets: list[DatasetRef] = []
    models: list[ModelRef] = []


class RunDetail(BaseModel):
    id: int
    path_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    datasets: list[DatasetRef] = []
    models: list[ModelRef] = []
    metrics: list[MetricRef] = []


class DocumentScore(BaseModel):
    doc_id: int
    score: float


class ScoreEntry(BaseModel):
    dataset_id: int
    model_id: int
    metric_id: str
    mean_score: float
    document_scores: list[DocumentScore] = []


class DashboardResponse(BaseModel):
    run_id: int
    datasets: list[DatasetRef]
    models: list[ModelRef]
    metrics: list[MetricRef]
    scores: list[ScoreEntry]
```

- [ ] **Step 4: Implement `backend/api/routers/runs.py`**

```python
from __future__ import annotations

from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas.runs import (
    DashboardResponse,
    DatasetRef,
    DocumentScore,
    MetricRef,
    ModelRef,
    RunDetail,
    RunSummary,
    ScoreEntry,
)

router = APIRouter(prefix="/api")


def _run_datasets(run_id: int, db: Session) -> list[DatasetRef]:
    rows = db.execute(
        text("""
            SELECT d.id, d.name FROM run_datasets rd
            JOIN datasets d ON d.id = rd.dataset_id
            WHERE rd.run_id = :run_id ORDER BY d.name
        """),
        {"run_id": run_id},
    ).mappings().all()
    return [DatasetRef(id=r["id"], name=r["name"]) for r in rows]


def _run_models(run_id: int, db: Session) -> list[ModelRef]:
    rows = db.execute(
        text("""
            SELECT m.id, m.name FROM run_models rm
            JOIN models m ON m.id = rm.model_id
            WHERE rm.run_id = :run_id ORDER BY m.name
        """),
        {"run_id": run_id},
    ).mappings().all()
    return [ModelRef(id=r["id"], name=r["name"]) for r in rows]


def _run_metrics(run_id: int, db: Session) -> list[MetricRef]:
    rows = db.execute(
        text("""
            SELECT metric_id, display_label FROM run_metrics
            WHERE run_id = :run_id ORDER BY metric_id
        """),
        {"run_id": run_id},
    ).mappings().all()
    return [MetricRef(metric_id=r["metric_id"], display_label=r["display_label"]) for r in rows]


@router.get("/runs", response_model=list[RunSummary])
def get_runs(db: Session = Depends(get_db)):
    rows = db.execute(
        text("SELECT id, path_id, title, description FROM evaluation_runs ORDER BY id")
    ).mappings().all()
    runs = []
    for r in rows:
        runs.append(
            RunSummary(
                id=r["id"],
                path_id=r["path_id"],
                title=r["title"],
                description=r["description"],
                datasets=_run_datasets(r["id"], db),
                models=_run_models(r["id"], db),
            )
        )
    return runs


@router.get("/runs/by-path/{path_id}", response_model=RunDetail)
def get_run_by_path(path_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text("""
            SELECT id, path_id, title, description FROM evaluation_runs
            WHERE path_id = :path_id
            ORDER BY created_at DESC LIMIT 1
        """),
        {"path_id": path_id},
    ).mappings().one_or_none()

    if row is None:
        raise HTTPException(status_code=404, detail="Run not found for path")

    run_id = row["id"]
    return RunDetail(
        id=run_id,
        path_id=row["path_id"],
        title=row["title"],
        description=row["description"],
        datasets=_run_datasets(run_id, db),
        models=_run_models(run_id, db),
        metrics=_run_metrics(run_id, db),
    )


@router.get("/runs/{run_id}/dashboard", response_model=DashboardResponse)
def get_dashboard(
    run_id: int,
    dataset_id: Optional[int] = None,
    model_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT ms.dataset_id, ms.model_id, ms.metric_id, ms.mean_score,
                   dms.document_id AS doc_id, dms.score AS doc_score
            FROM   metric_scores ms
            JOIN   document_metric_scores dms ON dms.metric_score_id = ms.id
            WHERE  ms.run_id = :run_id
            AND    (CAST(:dataset_id AS INTEGER) IS NULL
                    OR ms.dataset_id = CAST(:dataset_id AS INTEGER))
            AND    (CAST(:model_id AS INTEGER) IS NULL
                    OR ms.model_id = CAST(:model_id AS INTEGER))
            ORDER  BY ms.metric_id, ms.dataset_id, ms.mean_score DESC, dms.document_id
        """),
        {"run_id": run_id, "dataset_id": dataset_id, "model_id": model_id},
    ).mappings().all()

    grouped: dict[tuple, dict] = {}
    order: list[tuple] = []
    for row in rows:
        key = (row["dataset_id"], row["model_id"], row["metric_id"])
        if key not in grouped:
            grouped[key] = {
                "dataset_id": row["dataset_id"],
                "model_id": row["model_id"],
                "metric_id": row["metric_id"],
                "mean_score": row["mean_score"],
                "document_scores": [],
            }
            order.append(key)
        grouped[key]["document_scores"].append(
            DocumentScore(doc_id=row["doc_id"], score=row["doc_score"])
        )

    scores = [
        ScoreEntry(
            dataset_id=g["dataset_id"],
            model_id=g["model_id"],
            metric_id=g["metric_id"],
            mean_score=g["mean_score"],
            document_scores=g["document_scores"],
        )
        for g in (grouped[k] for k in order)
    ]

    return DashboardResponse(
        run_id=run_id,
        datasets=_run_datasets(run_id, db),
        models=_run_models(run_id, db),
        metrics=_run_metrics(run_id, db),
        scores=scores,
    )
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
cd backend
pytest tests/test_runs.py -v
```

Expected: all 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/api/schemas/runs.py backend/api/routers/runs.py backend/tests/test_runs.py
git commit -m "feat: add runs and dashboard endpoints"
```

---

## Task 4: Documents Router

**Files:**
- Modify: `backend/api/routers/documents.py`
- Create: `backend/tests/test_documents.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_documents.py`:

```python
def test_get_documents(client):
    run_resp = client.get(
        "/api/runs/by-path/mental_health_summarisation_social_media_posts"
    )
    run_id = run_resp.json()["id"]
    dataset_id = run_resp.json()["datasets"][0]["id"]

    response = client.get(f"/api/runs/{run_id}/documents?dataset_id={dataset_id}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    doc = data[0]
    for key in ("doc_id", "external_id", "gold_summary"):
        assert key in doc, f"missing key: {key}"


def test_get_document_detail(client):
    run_resp = client.get(
        "/api/runs/by-path/mental_health_summarisation_social_media_posts"
    )
    run_id = run_resp.json()["id"]
    dataset_id = run_resp.json()["datasets"][0]["id"]

    docs_resp = client.get(f"/api/runs/{run_id}/documents?dataset_id={dataset_id}")
    doc_id = docs_resp.json()[0]["doc_id"]

    response = client.get(f"/api/runs/{run_id}/documents/{doc_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["doc_id"] == doc_id
    assert "external_id" in data
    assert "gold_summary" in data
    assert "outputs" in data
    assert len(data["outputs"]) > 0
    output = data["outputs"][0]
    assert "model" in output
    assert "llm_summary" in output
    assert "scores" in output


def test_get_document_not_found(client):
    response = client.get("/api/runs/1/documents/999999")
    assert response.status_code == 404
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd backend
pytest tests/test_documents.py -v
```

Expected: all tests fail.

- [ ] **Step 3: Add document schemas to `backend/api/schemas/runs.py`**

Append to the end of `backend/api/schemas/runs.py`:

```python
class DocumentListItem(BaseModel):
    doc_id: int
    external_id: str
    gold_summary: Optional[str] = None


class SentenceDetail(BaseModel):
    scores: list[float] = []
    sents: list[str] = []


class MetricScore(BaseModel):
    score: float
    sentence_detail: Optional[SentenceDetail] = None


class ModelOutput(BaseModel):
    model: str
    llm_summary: Optional[str] = None
    scores: dict[str, MetricScore] = {}


class DocumentDetail(BaseModel):
    doc_id: int
    external_id: str
    dataset: str
    gold_summary: Optional[str] = None
    input: Optional[object] = None
    outputs: list[ModelOutput] = []
```

- [ ] **Step 4: Implement `backend/api/routers/documents.py`**

```python
from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas.runs import (
    DocumentDetail,
    DocumentListItem,
    MetricScore,
    ModelOutput,
    SentenceDetail,
)

router = APIRouter(prefix="/api")


@router.get(
    "/runs/{run_id}/documents",
    response_model=list[DocumentListItem],
)
def get_documents(
    run_id: int,
    dataset_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT DISTINCT doc.id AS doc_id, doc.external_id, doc.gold_summary
            FROM   document_metric_scores dms
            JOIN   metric_scores ms  ON ms.id  = dms.metric_score_id
            JOIN   documents     doc ON doc.id = dms.document_id
            WHERE  ms.run_id = :run_id
            AND    (CAST(:dataset_id AS INTEGER) IS NULL
                    OR doc.dataset_id = CAST(:dataset_id AS INTEGER))
            ORDER  BY doc.external_id
        """),
        {"run_id": run_id, "dataset_id": dataset_id},
    ).mappings().all()
    return [
        DocumentListItem(
            doc_id=r["doc_id"],
            external_id=r["external_id"],
            gold_summary=r["gold_summary"],
        )
        for r in rows
    ]


@router.get(
    "/runs/{run_id}/documents/{doc_id}",
    response_model=DocumentDetail,
)
def get_document(run_id: int, doc_id: int, db: Session = Depends(get_db)):
    doc_row = db.execute(
        text("""
            SELECT doc.id, doc.external_id, doc.gold_summary, doc.input,
                   d.name AS dataset_name
            FROM   documents doc
            JOIN   datasets  d ON d.id = doc.dataset_id
            WHERE  doc.id = :doc_id
        """),
        {"doc_id": doc_id},
    ).mappings().one_or_none()

    if doc_row is None:
        raise HTTPException(status_code=404, detail="Document not found")

    score_rows = db.execute(
        text("""
            SELECT m.name AS model_name, ms.metric_id,
                   dms.score, dms.sentence_detail,
                   mo.llm_summary
            FROM   document_metric_scores dms
            JOIN   metric_scores ms  ON ms.id  = dms.metric_score_id
            JOIN   models        m   ON m.id   = ms.model_id
            LEFT JOIN model_outputs mo
                      ON mo.run_id      = ms.run_id
                     AND mo.document_id = dms.document_id
                     AND mo.model_id    = ms.model_id
            WHERE  ms.run_id     = :run_id
            AND    dms.document_id = :doc_id
            ORDER  BY m.name, ms.metric_id
        """),
        {"run_id": run_id, "doc_id": doc_id},
    ).mappings().all()

    outputs_by_model: dict[str, dict] = {}
    for row in score_rows:
        model_name = row["model_name"]
        if model_name not in outputs_by_model:
            outputs_by_model[model_name] = {
                "model": model_name,
                "llm_summary": row["llm_summary"],
                "scores": {},
            }
        detail_raw = row["sentence_detail"]
        if isinstance(detail_raw, str):
            detail_raw = json.loads(detail_raw)
        sentence_detail = (
            SentenceDetail(
                scores=detail_raw.get("scores", []),
                sents=detail_raw.get("sents", []),
            )
            if detail_raw
            else None
        )
        outputs_by_model[model_name]["scores"][row["metric_id"]] = MetricScore(
            score=row["score"],
            sentence_detail=sentence_detail,
        )

    outputs = [
        ModelOutput(
            model=v["model"],
            llm_summary=v["llm_summary"],
            scores=v["scores"],
        )
        for v in outputs_by_model.values()
    ]

    return DocumentDetail(
        doc_id=doc_row["id"],
        external_id=doc_row["external_id"],
        dataset=doc_row["dataset_name"],
        gold_summary=doc_row["gold_summary"],
        input=doc_row["input"],
        outputs=outputs,
    )
```

- [ ] **Step 5: Run all backend tests**

```bash
cd backend
pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/api/routers/documents.py backend/api/schemas/runs.py backend/tests/test_documents.py
git commit -m "feat: add documents endpoints"
```

---

## Task 5: Vite Proxy and API Client

**Files:**
- Modify: `frontend/vite.config.js`
- Create: `frontend/src/api/client.js`

- [ ] **Step 1: Update `frontend/vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  return {
    plugins: [react()],
    base: "/",
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': 'http://localhost:8000',
      },
    },
  };
});
```

- [ ] **Step 2: Create `frontend/src/api/client.js`**

```js
/** @format */

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export async function get(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new ApiError(response.status, `API error ${response.status}: ${path}`);
  }
  return response.json();
}
```

- [ ] **Step 3: Verify the proxy works (requires both servers running)**

```bash
# Terminal 1
cd backend && uvicorn api.main:app --reload

# Terminal 2
cd frontend && npm run dev

# Terminal 3 — test proxy
curl http://localhost:5173/api/use-cases
```

Expected: JSON array of use cases.

- [ ] **Step 4: Commit**

```bash
git add frontend/vite.config.js frontend/src/api/client.js
git commit -m "feat: add Vite API proxy and API client base"
```

---

## Task 6: Config Service Functions and usePathConfig Hook

**Files:**
- Create: `frontend/src/api/config.js`
- Create: `frontend/src/hooks/usePathConfig.js`

- [ ] **Step 1: Create `frontend/src/api/config.js`**

```js
/** @format */

import { get } from './client';

export const getUseCases = () => get('/api/use-cases');

export const getPaths = (useCaseId) =>
  get(useCaseId ? `/api/paths?use_case_id=${useCaseId}` : '/api/paths');

export const getPath = (pathId) => get(`/api/paths/${pathId}`);

export const getInfrastructure = () => get('/api/infrastructure');
```

- [ ] **Step 2: Create `frontend/src/hooks/usePathConfig.js`**

```js
/** @format */

import { useEffect, useState } from 'react';
import { getInfrastructure, getPaths, getUseCases } from '../api/config';

export function usePathConfig() {
  const [useCases, setUseCases] = useState([]);
  const [paths, setPaths] = useState([]);
  const [infrastructure, setInfrastructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getUseCases(), getPaths(), getInfrastructure()])
      .then(([uc, p, infra]) => {
        setUseCases(uc);
        setPaths(p);
        setInfrastructure(infra);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { useCases, paths, infrastructure, loading, error };
}
```

- [ ] **Step 3: Smoke-test in browser console (requires both servers running)**

Open the browser console on any page and run:

```js
import('/src/api/config.js').then(m => m.getUseCases()).then(console.log)
```

Expected: array of use case objects logged.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/config.js frontend/src/hooks/usePathConfig.js
git commit -m "feat: add config service functions and usePathConfig hook"
```

---

## Task 7: Runs Service Functions

**Files:**
- Create: `frontend/src/api/runs.js`

- [ ] **Step 1: Create `frontend/src/api/runs.js`**

```js
/** @format */

import { get } from './client';

export const getRuns = () => get('/api/runs');

export const getRunByPath = (pathId) => get(`/api/runs/by-path/${pathId}`);

export const getDashboard = (runId, { datasetId, modelId } = {}) => {
  const params = new URLSearchParams();
  if (datasetId != null) params.set('dataset_id', datasetId);
  if (modelId != null) params.set('model_id', modelId);
  const qs = params.toString();
  return get(`/api/runs/${runId}/dashboard${qs ? `?${qs}` : ''}`);
};

export const getDocuments = (runId, datasetId) => {
  const qs = datasetId != null ? `?dataset_id=${datasetId}` : '';
  return get(`/api/runs/${runId}/documents${qs}`);
};

export const getDocument = (runId, docId) =>
  get(`/api/runs/${runId}/documents/${docId}`);
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/runs.js
git commit -m "feat: add runs service functions"
```

---

## Task 8: URL Routing Change in App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

The dashboard route changes from `/use-cases/:useCase/:task` to `/use-cases/tasks/:pathId`. The intermediate use-case-examples route changes from `/use-cases/:useCase` to `/use-cases/:useCaseId`. React Router v6 ranks `/use-cases/tasks/:pathId` as more specific than `/use-cases/:useCaseId`, so order does not matter.

- [ ] **Step 1: Update `frontend/src/App.jsx`**

```jsx
/** @format */

import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import Dashboard from "./pages/dashboard";
import DiagramNavigation from "./pages/diagramNavigation";
import UseCases from "./pages/useCases";
import UseCaseExamples from "./pages/useCaseExamples";
import IntrinsicMetrics from "./pages/intrinsicMetrics";
import CreateNew from "./pages/createNew";
import "./style.scss";

const App = () => (
  <div className="is-flex is-justify-content-center">
    <div style={{ width: "100%", maxWidth: "1400px" }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/intrinsic-metrics" element={<IntrinsicMetrics />} />
        <Route path="/use-cases" element={<UseCases />} />
        <Route path="/use-cases/:useCaseId" element={<UseCaseExamples />} />
        <Route path="/use-cases/tasks/:pathId" element={<Dashboard />} />
        <Route path="/diagram" element={<DiagramNavigation />} />
        <Route path="/evaluation-script-builder" element={<CreateNew />} />
      </Routes>
    </div>
  </div>
);

export default App;
```

- [ ] **Step 2: Verify the app builds without errors**

```bash
cd frontend
npm run build 2>&1 | tail -5
```

Expected: build succeeds (dashboard and useCaseExamples will show errors until Tasks 9-11 are done — the build may warn about unused imports).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: update routes to use pathId for dashboard"
```

---

## Task 9: useCases.jsx Rewrite

**Files:**
- Modify: `frontend/src/pages/useCases.jsx`

- [ ] **Step 1: Rewrite `frontend/src/pages/useCases.jsx`**

```jsx
/** @format */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "../components/breadcrumbs";
import ContentSquare from "../components/contentSquare";
import { getUseCases } from "../api/config";

const UseCases = () => {
  const navigate = useNavigate();
  const [useCases, setUseCases] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getUseCases()
      .then(setUseCases)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <Breadcrumbs />
      <h1 className="title">Select a use case!</h1>
      <section className="block">
        <div className="m-5"></div>
        <div className="fixed-grid has-4-cols has-2-cols-mobile">
          <div className="grid">
            {useCases.map((useCase) => (
              <ContentSquare
                key={useCase.id}
                content={
                  <h1 className="title has-text-centered is-capitalized">
                    {useCase.label}
                  </h1>
                }
                onClick={() => navigate(`/use-cases/${useCase.id}`)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default UseCases;
```

- [ ] **Step 2: Test in browser**

Start both servers and navigate to `/use-cases`. Confirm use case tiles appear and clicking navigates to `/use-cases/mental_health` (etc.).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/useCases.jsx
git commit -m "feat: useCases page fetches from API"
```

---

## Task 10: useCaseExamples.jsx Rewrite

**Files:**
- Modify: `frontend/src/pages/useCaseExamples.jsx`

Each visible task card shows the run title, description, and task label. Paths for the use case are fetched, then runs are fetched in parallel using `Promise.all`.

- [ ] **Step 1: Rewrite `frontend/src/pages/useCaseExamples.jsx`**

```jsx
/** @format */

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Breadcrumbs from "../components/breadcrumbs";
import ContentSquare from "../components/contentSquare";
import { getPaths } from "../api/config";
import { getRunByPath } from "../api/runs";

const createCardContent = (title, description, taskLabel) => (
  <div>
    <h3 className="subtitle is-capitalized has-text-weight-semibold">{title}</h3>
    <p className="tag is-info is-light mb-2">{taskLabel}</p>
    {description && (
      <p className="mt-2">
        <i>{description}</i>
      </p>
    )}
  </div>
);

const UseCaseExamples = () => {
  const { useCaseId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!useCaseId) return;
    getPaths(useCaseId)
      .then((paths) =>
        Promise.all(
          paths.map((path) =>
            getRunByPath(path.id)
              .then((run) => ({ path, run }))
              .catch(() => null)
          )
        )
      )
      .then((results) => setTasks(results.filter(Boolean)))
      .catch((err) => setError(err.message));
  }, [useCaseId]);

  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <Breadcrumbs />
      <h1 className="title is-capitalized">Select a task!</h1>
      <div className="m-5"></div>
      <div className="fixed-grid has-4-cols has-2-cols-mobile">
        <div className="grid">
          {tasks.map(({ path, run }) => (
            <ContentSquare
              key={path.id}
              content={createCardContent(run.title, run.description, path.task_label)}
              onClick={() => navigate(`/use-cases/tasks/${path.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default UseCaseExamples;
```

- [ ] **Step 2: Test in browser**

Navigate to `/use-cases/mental_health`. Confirm task cards appear with titles from the database and clicking a card navigates to `/use-cases/tasks/mental_health_summarisation_social_media_posts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/useCaseExamples.jsx
git commit -m "feat: useCaseExamples page fetches paths and runs from API"
```

---

## Task 11: MetricsScatterPlot + dashboard.jsx Rewrite

**Files:**
- Modify: `frontend/src/components/metricsScatterPlot.jsx`
- Modify: `frontend/src/pages/dashboard.jsx`

`MetricsScatterPlot` no longer receives `goldSummaries`, `llmSummaries`, `inputs`, or `detail`. Its `showDetails` callback only receives `{docId, tag, metricId, value}` — the dashboard fetches the full document on demand.

- [ ] **Step 1: Update `frontend/src/components/metricsScatterPlot.jsx`**

```jsx
/** @format */
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Plot from "react-plotly.js";

const MetricsScatterPlot = ({
  documentIds,
  dataPoints,
  showDetails,
  aspect,
  metric,
  tags,
  highlightedId,
  highlightedTag,
  means,
}) => {
  const [x, setX] = useState([]);
  const [y, setY] = useState([]);
  const [pointColours, setPointColours] = useState([]);
  const [pointSizes, setPointSizes] = useState([]);
  const [pointMeta, setPointMeta] = useState([]);

  useEffect(() => {
    const tempx = [];
    const tempy = [];
    const tempMeta = [];
    const tempColours = [];
    const tempSizes = [];

    for (let i = 0; i < dataPoints.length; i++) {
      for (let j = 0; j < dataPoints[i].length; j++) {
        const id = documentIds[i][j];
        tempx.push(dataPoints[i][j]);
        tempy.push(tags[i]);
        tempMeta.push({ docId: id, tag: tags[i], metricId: aspect });

        if (id === highlightedId && tags[i] === highlightedTag) {
          tempColours.push("rgba(255, 0, 0, 1)");
          tempSizes.push(16);
        } else {
          tempColours.push("rgba(0, 0, 255, 0.5)");
          tempSizes.push(12);
        }
      }
    }

    setPointColours(tempColours);
    setPointSizes(tempSizes);
    setPointMeta(tempMeta);
    setX(tempx);
    setY(tempy);
  }, [dataPoints, tags, documentIds, aspect, highlightedId, highlightedTag]);

  const meanLineX = [];
  const meanLineY = [];
  means.forEach((meanVal, idx) => {
    meanLineX.push(meanVal, meanVal, null);
    meanLineY.push(tags[idx], tags[idx], null);
  });

  const meanLineTrace = {
    x: meanLineX,
    y: meanLineY,
    mode: "markers+lines",
    type: "scatter",
    marker: { symbol: "line-ns-open", size: 16, color: "blue", line: { width: 2 } },
    hoverinfo: "skip",
    showlegend: false,
  };

  const plotData = [
    meanLineTrace,
    {
      x,
      y,
      customdata: pointMeta,
      mode: "markers",
      type: "scatter",
      marker: { size: pointSizes, color: pointColours },
      showlegend: false,
    },
  ];

  const layout = {
    title: { text: metric, font: { size: 16 }, x: 0, xanchor: "left" },
    xaxis: { title: "X Axis" },
    yaxis: {
      title: "Y Label",
      type: "category",
      categoryorder: "array",
      categoryarray: tags,
      autorange: "reversed",
      automargin: true,
    },
    margin: { l: 70, r: 20, t: 40, b: 20, pad: 0 },
    width: 700,
    height: tags.length * 30 + 60,
  };

  const handlePointClick = (event) => {
    if (!event?.points) return;
    const point = event.points[0];
    showDetails({ value: point.x, ...point.customdata });
  };

  return (
    <div className="p-4">
      <Plot data={plotData} layout={layout} onClick={handlePointClick} />
    </div>
  );
};

MetricsScatterPlot.propTypes = {
  documentIds: PropTypes.arrayOf(
    PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number]))
  ).isRequired,
  dataPoints: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  showDetails: PropTypes.func,
  aspect: PropTypes.string,
  metric: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.string).isRequired,
  means: PropTypes.arrayOf(PropTypes.number),
  highlightedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  highlightedTag: PropTypes.string,
};

MetricsScatterPlot.defaultProps = {
  showDetails: () => {},
  aspect: "",
  metric: "",
  means: [],
  highlightedId: null,
  highlightedTag: "",
};

export default MetricsScatterPlot;
```

- [ ] **Step 2: Rewrite `frontend/src/pages/dashboard.jsx`**

```jsx
/** @format */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Breadcrumbs from "../components/breadcrumbs";
import DocumentDisplay from "../components/documentDisplay";
import MetricsScatterPlot from "../components/metricsScatterPlot";
import { getDashboard, getDocument, getRunByPath } from "../api/runs";

const buildChartData = (dashData, byDataset, currentId, datasets, models) => {
  const result = {};

  for (const { metric_id, display_label } of dashData.metrics) {
    const relevantScores = dashData.scores.filter(
      (s) =>
        s.metric_id === metric_id &&
        (byDataset ? s.dataset_id === currentId : s.model_id === currentId)
    );

    result[metric_id] = {
      metric: display_label,
      means: relevantScores.map((s) => s.mean_score),
      tags: relevantScores.map((s) =>
        byDataset
          ? models.find((m) => m.id === s.model_id)?.name ?? String(s.model_id)
          : datasets.find((d) => d.id === s.dataset_id)?.name ?? String(s.dataset_id)
      ),
      dataPoints: relevantScores.map((s) => s.document_scores.map((d) => d.score)),
      documentIds: relevantScores.map((s) => s.document_scores.map((d) => d.doc_id)),
    };
  }

  return result;
};

const Dashboard = () => {
  const { pathId } = useParams();
  const [run, setRun] = useState(null);
  const [currentDatasetId, setCurrentDatasetId] = useState(null);
  const [currentModelId, setCurrentModelId] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [chartData, setChartData] = useState({});
  const [modalDetails, setModalDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pathId) return;
    getRunByPath(pathId)
      .then((r) => {
        setRun(r);
        if (r.datasets.length > 0) setCurrentDatasetId(r.datasets[0].id);
      })
      .catch((err) => setError(err.message));
  }, [pathId]);

  useEffect(() => {
    if (!run) return;
    const filter =
      currentDatasetId != null
        ? { datasetId: currentDatasetId }
        : currentModelId != null
        ? { modelId: currentModelId }
        : {};

    getDashboard(run.id, filter)
      .then(setDashData)
      .catch((err) => setError(err.message));
  }, [run, currentDatasetId, currentModelId]);

  useEffect(() => {
    if (!dashData || !run) return;
    const byDataset = currentDatasetId != null;
    const currentId = byDataset ? currentDatasetId : currentModelId;
    setChartData(buildChartData(dashData, byDataset, currentId, run.datasets, run.models));
  }, [dashData, run, currentDatasetId, currentModelId]);

  const handleShowDetails = useCallback(
    async ({ docId, tag, metricId, value }) => {
      if (!run) return;
      try {
        const doc = await getDocument(run.id, docId);
        const output = doc.outputs.find((o) => o.model === tag);
        const sentDetail = output?.scores?.[metricId]?.sentence_detail;
        setModalDetails({
          gold: doc.gold_summary,
          llm_sents: sentDetail ? sentDetail.sents : [output?.llm_summary ?? ""],
          llm_sent_scores: sentDetail ? sentDetail.scores : [],
          documentId: doc.external_id,
          tag,
          aspect: metricId,
          value,
          input: [],
        });
      } catch {
        // keep previous modal if fetch fails
      }
    },
    [run]
  );

  const clickOnDataset = (id) => {
    setCurrentDatasetId(id);
    setCurrentModelId(null);
  };

  const clickOnModel = (id) => {
    setCurrentModelId(id);
    setCurrentDatasetId(null);
  };

  if (error) return <div>Error: {error}</div>;
  if (!run) return <div>Loading…</div>;

  return (
    <>
      <div>
        <Breadcrumbs />
        <h1 className="title">{run.title}</h1>

        <section className="block">
          <div className="is-flex">
            <div className="is-flex is-align-items-center mr-5">
              <div style={{ width: "80px" }}>Datasets:</div>
              <div className="tabs is-toggle">
                <ul>
                  {run.datasets.map((dataset) => (
                    <li
                      key={dataset.id}
                      className={currentDatasetId === dataset.id ? "is-active" : ""}
                      onClick={() => clickOnDataset(dataset.id)}
                    >
                      <a><span>{dataset.name}</span></a>
                    </li>
                  ))}
                </ul>
              </div>
              <button className="button dark ml-2 is-small">Add dataset</button>
            </div>

            <div className="is-flex is-align-items-center">
              <div style={{ width: "80px" }}>Models:</div>
              <div className="tabs is-toggle">
                <ul>
                  {run.models.map((model) => (
                    <li
                      key={model.id}
                      className={currentModelId === model.id ? "is-active" : ""}
                      onClick={() => clickOnModel(model.id)}
                    >
                      <a><span>{model.name}</span></a>
                    </li>
                  ))}
                </ul>
              </div>
              <button className="button ml-2 is-small">Add model</button>
            </div>
          </div>
        </section>

        <section className="block">
          <div className="is-flex">
            <div>
              {Object.entries(chartData).map(
                ([metricId, { metric, means, tags, dataPoints, documentIds }], index) => (
                  <MetricsScatterPlot
                    key={index}
                    dataPoints={dataPoints}
                    documentIds={documentIds}
                    highlightedId={modalDetails?.documentId}
                    highlightedTag={modalDetails?.tag}
                    showDetails={handleShowDetails}
                    aspect={metricId}
                    metric={metric}
                    means={means}
                    tags={tags}
                  />
                )
              )}
            </div>
            <div>
              <DocumentDisplay
                gold={modalDetails?.gold}
                llm={modalDetails?.llm_sents}
                input={modalDetails?.input}
                documentScore={modalDetails?.value}
                scores={modalDetails?.llm_sent_scores}
                tag={modalDetails?.tag}
                documentId={modalDetails?.documentId}
                aspect={modalDetails?.aspect}
              />
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Dashboard;
```

- [ ] **Step 3: Test in browser**

Navigate to `/use-cases/tasks/mental_health_summarisation_social_media_posts`. Confirm:
- Run title appears in the heading
- Dataset and model tabs render
- Scatter plots render for each metric
- Clicking a plot point loads the document detail panel

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/metricsScatterPlot.jsx frontend/src/pages/dashboard.jsx
git commit -m "feat: dashboard and scatter plot use API with lazy document loading"
```

---

## Task 12: createNew.jsx Rewrite

**Files:**
- Modify: `frontend/src/pages/createNew.jsx`

All imports from `../data/script_builder` are replaced by `usePathConfig()`. Aspect and metric data come from `getPath(pathId)` called when the user selects a data source.

- [ ] **Step 1: Rewrite `frontend/src/pages/createNew.jsx`**

```jsx
/** @format */

import { useCallback, useEffect, useMemo, useState } from "react";
import AspectPopup from "../components/aspectPopup";
import Breadcrumbs from "../components/breadcrumbs";
import { getPath } from "../api/config";
import { usePathConfig } from "../hooks/usePathConfig";

const getAvailableTaskIds = (useCaseId, paths) => {
  const seen = new Set();
  return (paths || [])
    .filter((p) => p.use_case_id === useCaseId)
    .reduce((acc, p) => {
      if (!seen.has(p.task_id)) {
        seen.add(p.task_id);
        acc.push(p.task_id);
      }
      return acc;
    }, []);
};

const getAvailableDataSources = (useCaseId, taskId, paths) =>
  (paths || [])
    .filter((p) => p.use_case_id === useCaseId && p.task_id === taskId)
    .map((p) => ({ id: p.data_source_id, label: p.data_source_label, pathId: p.id }));

const getAspectCards = (pathConfig) => {
  if (!pathConfig?.aspects) return [];
  return [...pathConfig.aspects].sort((a, b) => a.sort_order - b.sort_order);
};

const getDefaultInfraSelection = (infrastructure) => ({
  compute_environment:
    infrastructure?.compute_environment?.options?.map((o) => o.id) ?? [],
  reference_mode:
    infrastructure?.reference_mode?.options?.map((o) => o.id) ?? [],
});

const getMetricIdsForAspect = ({ pathConfig, aspectId, selectedCompute, selectedReference }) => {
  const aspect = pathConfig?.aspects?.find((a) => a.id === aspectId);
  if (!aspect) return [];
  return aspect.metrics
    .filter((metric) => {
      const computeOk =
        metric.supported_compute_environments.length === 0 ||
        selectedCompute.some((c) => metric.supported_compute_environments.includes(c));
      const refOk =
        metric.supported_reference_modes.length === 0 ||
        selectedReference.some((r) => metric.supported_reference_modes.includes(r));
      return computeOk && refOk;
    })
    .map((m) => m.id);
};

const renderExamplesContent = (data) => {
  if (!data) return <p>No examples available yet.</p>;
  return (
    <div className="content">
      {data.original_posts?.length > 0 && (
        <>
          <h4>Original posts</h4>
          <ul>
            {data.original_posts.map((post, index) => (
              <li key={`${post}-${index}`}>{post}</li>
            ))}
          </ul>
        </>
      )}
      {data.good_summary && (
        <>
          <h4>Good summary</h4>
          <p>{data.good_summary}</p>
        </>
      )}
      {data.why_good && (
        <>
          <h4>Why this is good</h4>
          <p>{data.why_good}</p>
        </>
      )}
      {data.bad_summary && (
        <>
          <h4>Bad summary</h4>
          <p>{data.bad_summary}</p>
        </>
      )}
      {data.why_bad && (
        <>
          <h4>Why this is bad</h4>
          <p>{data.why_bad}</p>
        </>
      )}
    </div>
  );
};

const renderStakeholderRequirementsContent = (data) => {
  if (!data?.items?.length) return <p>No stakeholder requirements available yet.</p>;
  return (
    <div className="content">
      <ul>
        {data.items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

const renderMetricsContent = (metricIds, pathConfig, aspectId) => {
  if (!metricIds.length) return <p>No metrics available for this configuration yet.</p>;
  const aspect = pathConfig?.aspects?.find((a) => a.id === aspectId);
  const metricsInAspect = aspect?.metrics ?? [];
  return (
    <div>
      {metricIds.map((metricId) => {
        const metric = metricsInAspect.find((m) => m.id === metricId);
        return (
          <div key={metricId} className="box">
            <h4 className="title is-6 mb-2">{metric?.label ?? metricId}</h4>
            {metric?.tags?.length > 0 && (
              <div className="tags mb-3">
                {metric.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}
            <p>{metric?.description ?? "No description available."}</p>
          </div>
        );
      })}
    </div>
  );
};

const CreateNew = () => {
  const { useCases, paths, infrastructure, loading, error: configError } = usePathConfig();

  const [selectedUseCaseId, setSelectedUseCaseId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedDataSourceId, setSelectedDataSourceId] = useState("");
  const [selectedAspects, setSelectedAspects] = useState([]);
  const [selectedInfra, setSelectedInfra] = useState({ compute_environment: [], reference_mode: [] });

  const [pathConfig, setPathConfig] = useState(null);
  const [pathConfigLoading, setPathConfigLoading] = useState(false);

  const [activePopup, setActivePopup] = useState(null);
  const [activeAspectId, setActiveAspectId] = useState("");

  useEffect(() => {
    if (infrastructure) {
      setSelectedInfra(getDefaultInfraSelection(infrastructure));
    }
  }, [infrastructure]);

  const availableTaskIds = useMemo(
    () => getAvailableTaskIds(selectedUseCaseId, paths),
    [selectedUseCaseId, paths]
  );

  const availableDataSources = useMemo(
    () => getAvailableDataSources(selectedUseCaseId, selectedTaskId, paths),
    [selectedUseCaseId, selectedTaskId, paths]
  );

  const aspectCards = useMemo(() => getAspectCards(pathConfig), [pathConfig]);

  const canShowTasks = !!selectedUseCaseId && !loading;
  const canShowDataSources = canShowTasks && !!selectedTaskId;
  const canShowInfrastructure = canShowDataSources && !!selectedDataSourceId;
  const canShowAspects = canShowInfrastructure && !!pathConfig && !pathConfigLoading;

  const hasTaskData = availableTaskIds.length > 0;
  const hasDataSourceData = availableDataSources.length > 0;
  const hasAspectData = aspectCards.length > 0;

  const isInfraComplete =
    selectedInfra.compute_environment.length > 0 &&
    selectedInfra.reference_mode.length > 0;

  const canGenerate =
    !!selectedUseCaseId &&
    !!selectedTaskId &&
    !!selectedDataSourceId &&
    isInfraComplete &&
    selectedAspects.length > 0;

  const activeAspectData = useMemo(() => {
    if (!pathConfig || !activeAspectId) return null;
    return pathConfig?.aspects?.find((a) => a.id === activeAspectId) ?? null;
  }, [pathConfig, activeAspectId]);

  const activeMetricIds = useMemo(() => {
    if (!activeAspectId || !isInfraComplete || !pathConfig) return [];
    return getMetricIdsForAspect({
      pathConfig,
      aspectId: activeAspectId,
      selectedCompute: selectedInfra.compute_environment,
      selectedReference: selectedInfra.reference_mode,
    });
  }, [activeAspectId, isInfraComplete, pathConfig, selectedInfra]);

  const popupTitle = useMemo(() => {
    if (!activePopup || !activeAspectId) return "";
    const aspectLabel = activeAspectData?.label ?? activeAspectId;
    if (activePopup === "examples") return `${aspectLabel} — Examples`;
    if (activePopup === "stakeholder_requirements") return `${aspectLabel} — Stakeholder Requirements`;
    if (activePopup === "metrics") return `${aspectLabel} — Metrics`;
    return aspectLabel;
  }, [activePopup, activeAspectId, activeAspectData]);

  const popupContent = useMemo(() => {
    if (!activePopup || !activeAspectId || !activeAspectData) return null;
    if (activePopup === "examples") return renderExamplesContent(activeAspectData.examples);
    if (activePopup === "stakeholder_requirements")
      return renderStakeholderRequirementsContent(activeAspectData.stakeholder_requirements);
    if (activePopup === "metrics")
      return renderMetricsContent(activeMetricIds, pathConfig, activeAspectId);
    return null;
  }, [activePopup, activeAspectId, activeAspectData, activeMetricIds, pathConfig]);

  const closePopup = useCallback(() => {
    setActivePopup(null);
    setActiveAspectId("");
  }, []);

  const resetDownstreamState = useCallback(() => {
    setSelectedDataSourceId("");
    setSelectedAspects([]);
    setSelectedInfra(getDefaultInfraSelection(infrastructure));
    setPathConfig(null);
    closePopup();
  }, [closePopup, infrastructure]);

  const onSelectUseCase = (useCaseId) => {
    setSelectedUseCaseId(useCaseId);
    setSelectedTaskId("");
    resetDownstreamState();
  };

  const onSelectTask = (taskId) => {
    setSelectedTaskId(taskId);
    resetDownstreamState();
  };

  const onSelectDataSource = useCallback(
    async (dataSourceId, pathId) => {
      setSelectedDataSourceId(dataSourceId);
      setSelectedAspects([]);
      setSelectedInfra(getDefaultInfraSelection(infrastructure));
      closePopup();
      setPathConfigLoading(true);
      try {
        const config = await getPath(pathId);
        setPathConfig(config);
      } catch {
        setPathConfig(null);
      } finally {
        setPathConfigLoading(false);
      }
    },
    [closePopup, infrastructure]
  );

  const onToggleInfraOption = (groupId, optionId) => {
    setSelectedInfra((prev) => {
      const current = prev[groupId] ?? [];
      const isSelected = current.includes(optionId);
      return {
        ...prev,
        [groupId]: isSelected ? current.filter((id) => id !== optionId) : [...current, optionId],
      };
    });
  };

  const toggleAspect = (aspectId) => {
    setSelectedAspects((prev) =>
      prev.includes(aspectId) ? prev.filter((id) => id !== aspectId) : [...prev, aspectId]
    );
  };

  const openPopup = (aspectId, popupType) => {
    setActiveAspectId(aspectId);
    setActivePopup(popupType);
  };

  const onGenerate = () => {
    const useCase = useCases.find((uc) => uc.id === selectedUseCaseId);
    const dataSource = availableDataSources.find((ds) => ds.id === selectedDataSourceId);
    const taskLabel =
      paths.find(
        (p) => p.use_case_id === selectedUseCaseId && p.task_id === selectedTaskId
      )?.task_label ?? selectedTaskId;

    // eslint-disable-next-line no-alert
    alert(
      [
        `Use Case: ${useCase?.label ?? selectedUseCaseId}`,
        `Task: ${taskLabel}`,
        `Data Source: ${dataSource?.label ?? selectedDataSourceId}`,
        `Compute: ${selectedInfra.compute_environment.join(", ")}`,
        `Reference Mode: ${selectedInfra.reference_mode.join(", ")}`,
        `Aspects: ${selectedAspects.join(", ")}`,
      ].join("\n")
    );
  };

  if (configError) return <div>Error loading config: {configError}</div>;
  if (loading) return <div>Loading…</div>;

  return (
    <div className="container is-max-desktop">
      <Breadcrumbs />
      <section className="section pb-4">
        <h1 className="title is-4">Evaluation Script Builder</h1>
        <p className="subtitle is-6">
          Build an evaluation configuration bottom-up: use case → task → data source → infrastructure → aspects.
        </p>
      </section>

      <section className="section pt-0">
        <h2 className="title is-6 mb-3">USE CASE</h2>
        <div className="buttons">
          {useCases.map((useCase) => (
            <button
              key={useCase.id}
              type="button"
              className={`button ${selectedUseCaseId === useCase.id ? "is-link" : "is-light"}`}
              onClick={() => onSelectUseCase(useCase.id)}
            >
              {useCase.label}
            </button>
          ))}
        </div>
      </section>

      {canShowTasks && (
        <section className="section pt-0">
          <h2 className="title is-6 mb-3">TASK</h2>
          {hasTaskData ? (
            <div className="buttons">
              {availableTaskIds.map((taskId) => {
                const taskLabel =
                  paths.find(
                    (p) => p.use_case_id === selectedUseCaseId && p.task_id === taskId
                  )?.task_label ?? taskId;
                return (
                  <button
                    key={taskId}
                    type="button"
                    className={`button ${selectedTaskId === taskId ? "is-link" : "is-light"}`}
                    onClick={() => onSelectTask(taskId)}
                  >
                    {taskLabel}
                  </button>
                );
              })}
            </div>
          ) : (
            <article className="message is-warning">
              <div className="message-body">No data available for this USE CASE yet.</div>
            </article>
          )}
        </section>
      )}

      {canShowDataSources && (
        <section className="section pt-0">
          <h2 className="title is-6 mb-3">DATA SOURCE</h2>
          {hasDataSourceData ? (
            <div className="buttons">
              {availableDataSources.map((dataSource) => (
                <button
                  key={dataSource.id}
                  type="button"
                  className={`button ${selectedDataSourceId === dataSource.id ? "is-link" : "is-light"}`}
                  onClick={() => onSelectDataSource(dataSource.id, dataSource.pathId)}
                >
                  {dataSource.label}
                </button>
              ))}
            </div>
          ) : (
            <article className="message is-warning">
              <div className="message-body">No data available for this TASK yet.</div>
            </article>
          )}
        </section>
      )}

      {canShowInfrastructure && (
        <section className="section pt-0">
          <h2 className="title is-6 mb-3">INFRASTRUCTURE CONSTRAINTS</h2>
          <p className="content mb-2">Filter metrics based on your infrastructure requirements.</p>

          <div className="mb-5">
            <p className="content is-small mb-2">
              {infrastructure?.compute_environment?.label ?? "Compute environment"}
            </p>
            <div className="buttons">
              {(infrastructure?.compute_environment?.options ?? []).map((option) => {
                const checked = selectedInfra.compute_environment.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={`checkbox ${checked ? "is-link" : "is-light"}`}
                  >
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={checked}
                      onChange={() => onToggleInfraOption("compute_environment", option.id)}
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <p className="content is-small mb-2">
              {infrastructure?.reference_mode?.label ?? "References"}
            </p>
            <div className="buttons">
              {(infrastructure?.reference_mode?.options ?? []).map((option) => {
                const checked = selectedInfra.reference_mode.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={`checkbox ${checked ? "is-link" : "is-light"}`}
                  >
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={checked}
                      onChange={() => onToggleInfraOption("reference_mode", option.id)}
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {pathConfigLoading && (
        <section className="section pt-0">
          <p>Loading aspects…</p>
        </section>
      )}

      {canShowAspects && (
        <section className="section pt-0">
          <div className="has-text-centered mb-5">
            <h2 className="title is-5 mb-2">WHAT DO YOU WANT TO EVALUATE?</h2>
            <p className="subtitle is-6">Aspects are sociotechnical interpretations of real-world needs</p>
          </div>

          {hasAspectData ? (
            <div className="columns is-multiline is-centered">
              {aspectCards.map((aspect) => {
                const isSelected = selectedAspects.includes(aspect.id);
                return (
                  <div key={aspect.id} className="column is-6">
                    <div className="card">
                      <div className="card-content">
                        <label className="checkbox is-flex is-align-items-center mb-3">
                          <input
                            type="checkbox"
                            className="mr-3"
                            checked={isSelected}
                            onChange={() => toggleAspect(aspect.id)}
                          />
                          <span className="title is-6 mb-0">{aspect.label}</span>
                        </label>
                        <p className="content mb-4">{aspect.definition}</p>
                        <div className="buttons are-small">
                          <button
                            type="button"
                            className="button is-small is-light"
                            onClick={() => openPopup(aspect.id, "examples")}
                          >
                            Show Examples
                          </button>
                          <button
                            type="button"
                            className="button is-small is-light"
                            onClick={() => openPopup(aspect.id, "stakeholder_requirements")}
                          >
                            Show Stakeholder Requirements
                          </button>
                          <button
                            type="button"
                            className="button is-small is-light"
                            onClick={() => openPopup(aspect.id, "metrics")}
                          >
                            Show Metrics
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <article className="message is-warning">
              <div className="message-body">No aspects available for this context yet.</div>
            </article>
          )}

          <div className="field is-grouped is-grouped-centered mt-5">
            <p className="control">
              <button
                type="button"
                className="button is-link"
                disabled={!canGenerate}
                onClick={canGenerate ? onGenerate : undefined}
              >
                Generate Evaluation Script
              </button>
            </p>
          </div>
        </section>
      )}

      <AspectPopup
        isOpen={!!activePopup && !!activeAspectId}
        title={popupTitle}
        onClose={closePopup}
      >
        {popupContent}
      </AspectPopup>
    </div>
  );
};

export default CreateNew;
```

- [ ] **Step 2: Test in browser**

Navigate to `/evaluation-script-builder`. Confirm:
- Use case buttons appear (loaded from API)
- Selecting a use case shows task buttons
- Selecting a task shows data source buttons
- Selecting a data source triggers loading indicator then shows infrastructure + aspects
- "Show Examples", "Show Stakeholder Requirements", "Show Metrics" popups work
- "Generate Evaluation Script" alert fires with correct values when all selections made

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/createNew.jsx frontend/src/hooks/usePathConfig.js
git commit -m "feat: createNew uses API via usePathConfig hook"
```

---

## Task 13: Delete Local Data Files

**Files:**
- Delete: `frontend/src/data/UseCases.json`
- Delete: `frontend/src/data/ai-for-mental-health/summarise-social-media-threads.json`
- Delete: `frontend/src/data/ai-legal-support/summarise-supreme-court-cases.json`
- Delete: `frontend/src/data/multi-modal-medical-diagnostics-and-monitoring/multimodal_chest-xray_report_generation.json`
- Delete: `frontend/src/data/createTask.json`
- Delete: `frontend/src/data/evalConfig.js`
- Delete: `frontend/src/data/script_builder/` (all files)
- Delete: `frontend/src/utils/loadJsonFolder.jsx`

- [ ] **Step 1: Verify no remaining imports of deleted files**

```bash
cd frontend
grep -r "UseCases.json\|loadJsonFolder\|script_builder\|createTask.json\|evalConfig" src/ --include="*.jsx" --include="*.js"
```

Expected: no output (zero matches). If any files still import from these paths, fix them before deleting.

- [ ] **Step 2: Delete data files and utilities**

```bash
cd frontend
git rm src/data/UseCases.json
git rm src/data/createTask.json
git rm src/data/evalConfig.js
git rm src/data/ai-for-mental-health/summarise-social-media-threads.json
git rm src/data/ai-legal-support/summarise-supreme-court-cases.json
git rm "src/data/multi-modal-medical-diagnostics-and-monitoring/multimodal_chest-xray_report_generation.json"
git rm -r src/data/script_builder/
git rm src/utils/loadJsonFolder.jsx
```

- [ ] **Step 3: Verify the build succeeds**

```bash
cd frontend
npm run build 2>&1 | tail -10
```

Expected: build completes with no errors about missing modules.

- [ ] **Step 4: Run a final smoke test in the browser**

With both servers running, verify:
1. `/use-cases` — shows use case tiles
2. `/use-cases/mental_health` — shows task cards
3. `/use-cases/tasks/mental_health_summarisation_social_media_posts` — shows dashboard with scatter plots
4. `/evaluation-script-builder` — shows builder with full interaction flow

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: remove all local data files — frontend now fully API-driven"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| `backend/api/main.py` with CORS + router mounting | Task 1 |
| `backend/api/db.py` with `get_db()` | Task 1 |
| `GET /api/use-cases` | Task 2 |
| `GET /api/paths` (+ `?use_case_id=` filter) | Task 2 |
| `GET /api/paths/{path_id}` | Task 2 |
| `GET /api/infrastructure` | Task 2 |
| `GET /api/runs` | Task 3 |
| `GET /api/runs/by-path/{path_id}` | Task 3 |
| `GET /api/runs/{run_id}/dashboard` with `?dataset_id=` / `?model_id=` | Task 3 |
| `GET /api/runs/{run_id}/documents` | Task 4 |
| `GET /api/runs/{run_id}/documents/{doc_id}` | Task 4 |
| Vite proxy `/api` → `http://localhost:8000` | Task 5 |
| `frontend/src/api/client.js` | Task 5 |
| `frontend/src/api/config.js` | Task 6 |
| `usePathConfig()` hook | Task 6 |
| `frontend/src/api/runs.js` | Task 7 |
| URL route `/use-cases/tasks/:pathId` | Task 8 |
| `useCases.jsx` calls API | Task 9 |
| `useCaseExamples.jsx` calls API, navigates to `:pathId` | Task 10 |
| `dashboard.jsx` uses `getRunByPath` + `getDashboard` + lazy `getDocument` | Task 11 |
| `createNew.jsx` uses `usePathConfig()` + `getPath()` | Task 12 |
| All local data files removed | Task 13 |

**Note on route:** The spec shows `/use-cases/:pathId` for the dashboard. This plan uses `/use-cases/tasks/:pathId` to avoid collision with `/use-cases/:useCaseId` (UseCaseExamples). The intent is identical — path IDs are used directly in the URL.
