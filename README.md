# AdSoLve Evaluation Platform

A web application for evaluating and comparing LLM outputs across different use cases (mental health, legal support, medical diagnostics). It provides an interactive dashboard for exploring evaluation results, and an evaluation script builder that guides users through selecting metrics and configuration for a selected task.

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React + Vite, Bulma (CSS framework) |
| Backend  | FastAPI (Python)                    |
| Database | PostgreSQL                          |

## Repository Structure

```
adsolve_evaluation_platform/
├── frontend/               # React/Vite app
│   ├── src/
│   │   ├── api/            # HTTP service layer (wraps all fetch() calls)
│   │   ├── components/     # Shared UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page-level components (dashboard, createNew, etc.)
│   │   └── utils/
│   └── vite.config.js      # Dev server + API proxy config
│
├── backend/                # FastAPI app + database tooling
│   ├── api/
│   │   ├── main.py         # FastAPI app entry point, CORS middleware, router mounting
│   │   ├── db.py           # SQLAlchemy engine and session dependency
│   │   ├── routers/        # Route handlers (config.py, runs.py, documents.py)
│   │   └── schemas/        # Pydantic response models
│   ├── migrate.py          # Creates tables and seeds data from evaluation bundles
│   ├── evaluation_bundles/ # Raw evaluation result JSON files
│   └── requirements.txt
│
└── docs/                   # Design specs and implementation plans
```

## Installation

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

## Running the App

### 1. Database

Run a local PostgreSQL instance. The database is named `adsolve`.

### 2. Backend

```bash
cd backend
source .venv/bin/activate
uvicorn api.main:app --reload
```

The API runs on `http://localhost:8000`. Interactive docs are available at `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
npm run dev
```

The app runs on `http://localhost:5173`. The Vite dev server proxies `/api/*` requests to the backend at `http://127.0.0.1:8000`, so no CORS configuration is needed during development.