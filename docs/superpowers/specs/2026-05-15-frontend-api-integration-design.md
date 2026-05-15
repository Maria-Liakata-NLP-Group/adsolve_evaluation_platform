# Frontend API Integration Design

**Date:** 2026-05-15
**Status:** Approved

## Goal

Replace all static local data imports in the React frontend with calls to a FastAPI backend. After this work, the frontend has no local JSON or YAML data files — all evaluation results and script builder config are served from the PostgreSQL database via HTTP.

## Context

The project has:
- A PostgreSQL database populated by `backend/migrate.py`
- A React/Vite frontend that currently loads evaluation results via dynamic `import('../data/${useCase}/${task}.json')` and loads script builder config via static `?raw` YAML imports at build time
- No HTTP API layer yet

## Approach: Granular REST + frontend service layer

Clean resource-oriented FastAPI endpoints. A thin `frontend/src/api/` module wraps all `fetch()` calls so pages never touch URLs directly. The inline data-assembly logic currently spread across `dashboard.jsx` `useEffect` blocks moves into the API (pre-sorted scores) and the service layer (typed response shapes).

---

## Backend API

### Package structure

```
backend/api/
  main.py          ← FastAPI app, CORS middleware, router mounting
  db.py            ← SQLAlchemy engine + get_db() session dependency
  routers/
    config.py      ← /api/use-cases, /api/paths, /api/infrastructure
    runs.py        ← /api/runs, /api/runs/by-path/{path_id}, /api/runs/{run_id}/dashboard
    documents.py   ← /api/runs/{run_id}/documents, /api/runs/{run_id}/documents/{doc_id}
  schemas/
    config.py      ← Pydantic response models for config domain
    runs.py        ← Pydantic response models for results domain
```

### Endpoints

#### Config

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/api/use-cases` | List of `{id, label, description}` |
| `GET` | `/api/paths` | List of `{id, use_case_id, task_id, data_source_label, use_case_label, task_label}` |
| `GET` | `/api/paths/{path_id}` | Full path: use case, task, data source, aspects with definitions/examples/stakeholder requirements/metrics |
| `GET` | `/api/infrastructure` | Compute environment and reference mode options with labels |

#### Runs & results

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/api/runs` | List of runs with `{id, path_id, title, datasets[], models[]}` |
| `GET` | `/api/runs/by-path/{path_id}` | Single run for the given path (most recent if multiple) |
| `GET` | `/api/runs/{run_id}/dashboard` | Mean scores per `(dataset, model, metric)`, pre-sorted descending by score. Accepts `?dataset_id=` or `?model_id=` query params to filter the comparison axis. |
| `GET` | `/api/runs/{run_id}/documents` | Document list: `{doc_id, external_id, gold_summary}` per dataset |
| `GET` | `/api/runs/{run_id}/documents/{doc_id}` | Full document detail: gold summary, LLM summaries per model, per-metric scores, sentence-level detail |

#### `/api/runs/{run_id}/dashboard` response shape

```json
{
  "run_id": 1,
  "datasets": [{"id": 3, "name": "Mimic"}, {"id": 4, "name": "ReXGradient"}],
  "models": [{"id": 5, "name": "Maira-2 (with indication)"}, ...],
  "metrics": [{"metric_id": "green_score", "display_label": "Clinical Relevance (Green Score)"}, ...],
  "scores": [
    {
      "dataset_id": 3,
      "model_id": 5,
      "metric_id": "green_score",
      "mean_score": 0.412,
      "document_scores": [0.38, 0.44, ...]
    },
    ...
  ]
}
```

#### `/api/runs/{run_id}/documents/{doc_id}` response shape

```json
{
  "doc_id": 42,
  "external_id": "10433869",
  "dataset": "Mimic",
  "gold_summary": "The heart size is normal…",
  "outputs": [
    {
      "model": "Maira-2 (with indication)",
      "llm_summary": "Heart size normal. Lungs clear…",
      "scores": {
        "green_score": {
          "score": 0.44,
          "sentence_detail": {"scores": [0.91, 0.88], "sents": ["…", "…"]}
        }
      }
    }
  ]
}
```

### CORS

During development, CORS is not needed (Vite proxies `/api` to port 8000). In production, FastAPI's `CORSMiddleware` allows the frontend origin explicitly. Origins are configured via the `ALLOWED_ORIGINS` environment variable.

---

## Frontend service layer

### Structure

```
frontend/src/api/
  client.js     ← base GET wrapper; reads VITE_API_BASE_URL; throws ApiError on non-2xx
  config.js     ← getUseCases(), getPaths(), getPath(pathId), getInfrastructure()
  runs.js       ← getRunByPath(pathId), getDashboard(runId, {datasetId, modelId}),
                   getDocuments(runId), getDocument(runId, docId)
```

`client.js` is the only place that knows the base URL. All other files call `get('/api/...')`.

### Dev proxy

`vite.config.js` gets a proxy entry:

```js
server: {
  proxy: {
    '/api': 'http://localhost:8000'
  }
}
```

Production deployments set `VITE_API_BASE_URL` in the environment.

---

## Page-level changes

### URL routing change

The current route `/use-cases/:useCase/:task` uses human-readable slugs (e.g., `ai-for-mental-health` / `summarise-social-media-threads`) that have no direct mapping to `path_id`. The route is changed to `/use-cases/:pathId` so `dashboard.jsx` can call the API directly. Navigation links in `useCaseExamples.jsx` are updated to use `path.id` (fetched from `/api/paths`). The human-readable title is taken from the run's `title` field returned by the API.

### `dashboard.jsx`

**Before:** one `useEffect` does `import('../data/${useCase}/${task}.json')` and sets 6 pieces of state from the raw JSON. A second 80-line `useEffect` assembles the dashboard data inline by sorting and re-indexing arrays.

**After:**
- Reads `pathId` from `useParams()`.
- `getRunByPath(pathId)` on mount to get `runId` + metadata (datasets, models, metrics).
- `getDashboard(runId, { datasetId })` (or `{ modelId }`) when the user toggles the comparison axis — API returns pre-sorted scores, eliminating the inline assembly `useEffect`.
- `getDocument(runId, docId)` on demand when a data point is clicked, replacing the full document bundle in the initial load.

### `createNew.jsx`

**Before:** module-level constants (`USE_CASES`, `TASKS`, `ASPECTS`, `METRICS`, `PATH_INDEX`, `PATHS_BY_ID`) imported synchronously from `script_builder/index.js` at build time.

**After:** a `usePathConfig()` hook calls `getUseCases()`, `getPaths()`, and `getInfrastructure()` on mount. `getPath(pathId)` is called when a data source is selected to load the full aspect/metric config for that path. The component gets a loading state while config arrives.

### `useCases.jsx` / `useCaseExamples.jsx`

Currently read from `UseCases.json` (discarded). These will call `GET /api/runs` to list available tasks, and `GET /api/runs/by-path/{path_id}` to get run metadata for each task card.

### `src/data/script_builder/` and `src/data/<use-case>/` directories

All local data files (`*.yaml`, `*.json`) are removed from the frontend once API integration is complete. The `script_builder/index.js` module is deleted.

---

## Out of scope

- Authentication / authorisation (no auth in this phase)
- The "Add dataset" / "Add model" upload flow (separate feature)
- Database migrations for new schema changes (schema is stable after `migrate.py`)
