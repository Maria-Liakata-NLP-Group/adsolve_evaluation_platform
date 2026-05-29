"""Database migration for AdSoLve evaluation platform.

Creates the PostgreSQL schema and seeds all data from the YAML config
and JSON evaluation result files in frontend/src/data/.

Usage:
    python migrate.py
    DATABASE_URL=postgresql+psycopg2://user@host/db python migrate.py
"""

from __future__ import annotations

import getpass
import json
import os
from pathlib import Path

import yaml
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# ── Paths ─────────────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "legacy_data"
GLOBALS_DIR = DATA_DIR / "script_builder" / "globals"
PATHS_DIR = DATA_DIR / "script_builder" / "paths"

# Maps each result JSON file to its path_id in the paths table.
RESULT_FILES: list[tuple[Path, str]] = [
    (
        DATA_DIR / "ai-for-mental-health" / "summarise-social-media-threads.json",
        "mental_health_summarisation_social_media_posts",
    ),
    (
        DATA_DIR / "ai-legal-support" / "summarise-supreme-court-cases.json",
        "legal_support_press_summaries_supreme_court_judgements",
    ),
    (
        DATA_DIR
        / "multi-modal-medical-diagnostics-and-monitoring"
        / "multimodal_chest-xray_report_generation.json",
        "medical_diagnostics_chest_xray_report_generation",
    ),
]

# ── Database URL ──────────────────────────────────────────────────────────────


def get_database_url() -> str:
    default_user = getpass.getuser()
    return os.environ.get(
        "DATABASE_URL",
        f"postgresql+psycopg2://{default_user}@localhost:5432/adsolve",
    )


# ── Schema DDL ────────────────────────────────────────────────────────────────

# Each string is a single DDL statement (no trailing semicolons).
SCHEMA_STATEMENTS = [
    # ── Config / catalog ──────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS use_cases (
        id          TEXT PRIMARY KEY,
        label       TEXT NOT NULL,
        description TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS tasks (
        id    TEXT PRIMARY KEY,
        label TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS aspects (
        id          TEXT PRIMARY KEY,
        label       TEXT NOT NULL,
        description TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS metrics (
        id                             TEXT PRIMARY KEY,
        label                          TEXT NOT NULL,
        description                    TEXT,
        tags                           TEXT[],
        supported_compute_environments TEXT[],
        supported_reference_modes      TEXT[]
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS paths (
        id                      TEXT PRIMARY KEY,
        use_case_id             TEXT NOT NULL REFERENCES use_cases(id),
        task_id                 TEXT NOT NULL REFERENCES tasks(id),
        data_source_id          TEXT NOT NULL,
        data_source_label       TEXT NOT NULL,
        data_source_description TEXT,
        task_description        TEXT
    )
    """,
    # Rich per-path aspect content (definition, examples, requirements) lives in
    # JSONB because it is always fetched as a unit — never filtered row-by-row.
    """
    CREATE TABLE IF NOT EXISTS path_aspects (
        id                       SERIAL  PRIMARY KEY,
        path_id                  TEXT    NOT NULL REFERENCES paths(id) ON DELETE CASCADE,
        aspect_id                TEXT    NOT NULL REFERENCES aspects(id),
        definition               TEXT    NOT NULL,
        sort_order               INTEGER NOT NULL DEFAULT 0,
        examples                 JSONB,
        stakeholder_requirements JSONB,
        UNIQUE (path_id, aspect_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS path_aspect_metrics (
        path_aspect_id INTEGER NOT NULL REFERENCES path_aspects(id) ON DELETE CASCADE,
        metric_id      TEXT    NOT NULL REFERENCES metrics(id),
        PRIMARY KEY (path_aspect_id, metric_id)
    )
    """,
    # ── Evaluation results ────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS evaluation_runs (
        id         SERIAL      PRIMARY KEY,
        path_id    TEXT        REFERENCES paths(id),
        title      TEXT        NOT NULL,
        notes      TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (path_id, title)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS datasets (
        id   SERIAL PRIMARY KEY,
        name TEXT   NOT NULL UNIQUE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS models (
        id   SERIAL PRIMARY KEY,
        name TEXT   NOT NULL UNIQUE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS run_datasets (
        run_id     INTEGER NOT NULL REFERENCES evaluation_runs(id) ON DELETE CASCADE,
        dataset_id INTEGER NOT NULL REFERENCES datasets(id),
        PRIMARY KEY (run_id, dataset_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS run_models (
        run_id   INTEGER NOT NULL REFERENCES evaluation_runs(id) ON DELETE CASCADE,
        model_id INTEGER NOT NULL REFERENCES models(id),
        PRIMARY KEY (run_id, model_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS run_metrics (
        run_id        INTEGER NOT NULL REFERENCES evaluation_runs(id) ON DELETE CASCADE,
        metric_id     TEXT    NOT NULL REFERENCES metrics(id),
        display_label TEXT,
        PRIMARY KEY (run_id, metric_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS documents (
        id           SERIAL  PRIMARY KEY,
        dataset_id   INTEGER NOT NULL REFERENCES datasets(id),
        external_id  TEXT    NOT NULL,
        gold_summary TEXT,
        UNIQUE (dataset_id, external_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS model_outputs (
        id          SERIAL  PRIMARY KEY,
        run_id      INTEGER NOT NULL REFERENCES evaluation_runs(id) ON DELETE CASCADE,
        document_id INTEGER NOT NULL REFERENCES documents(id),
        model_id    INTEGER NOT NULL REFERENCES models(id),
        llm_summary TEXT,
        input       JSONB,
        UNIQUE (run_id, document_id, model_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS metric_scores (
        id         SERIAL           PRIMARY KEY,
        run_id     INTEGER          NOT NULL REFERENCES evaluation_runs(id) ON DELETE CASCADE,
        dataset_id INTEGER          NOT NULL REFERENCES datasets(id),
        model_id   INTEGER          NOT NULL REFERENCES models(id),
        metric_id  TEXT             NOT NULL REFERENCES metrics(id),
        mean_score DOUBLE PRECISION NOT NULL,
        UNIQUE (run_id, dataset_id, model_id, metric_id)
    )
    """,
    # sentence_detail stores [{scores: [...], sents: [...]}] per document;
    # kept as JSONB because it is only ever rendered whole, never aggregated.
    """
    CREATE TABLE IF NOT EXISTS document_metric_scores (
        id              SERIAL           PRIMARY KEY,
        metric_score_id INTEGER          NOT NULL REFERENCES metric_scores(id) ON DELETE CASCADE,
        document_id     INTEGER          NOT NULL REFERENCES documents(id),
        score           DOUBLE PRECISION NOT NULL,
        sentence_detail JSONB,
        UNIQUE (metric_score_id, document_id)
    )
    """,
]


def create_schema(conn) -> None:
    for stmt in SCHEMA_STATEMENTS:
        conn.execute(text(stmt))


# ── Config seed ───────────────────────────────────────────────────────────────


def seed_config(conn) -> None:
    _seed_use_cases(conn)
    _seed_tasks(conn)
    _seed_aspects(conn)
    _seed_metrics(conn)
    _seed_paths(conn)


def _seed_use_cases(conn) -> None:
    data = yaml.safe_load((GLOBALS_DIR / "use_cases.yaml").read_text())
    for uc_id, uc in data["use_cases"].items():
        conn.execute(
            text("""
                INSERT INTO use_cases (id, label, description)
                VALUES (:id, :label, :description)
                ON CONFLICT (id) DO UPDATE
                    SET label = EXCLUDED.label,
                        description = EXCLUDED.description
            """),
            {"id": uc_id, "label": uc["label"], "description": uc.get("description")},
        )


def _seed_tasks(conn) -> None:
    data = yaml.safe_load((GLOBALS_DIR / "tasks.yaml").read_text())
    for task_id, task in data["tasks"].items():
        conn.execute(
            text("""
                INSERT INTO tasks (id, label) VALUES (:id, :label)
                ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label
            """),
            {"id": task_id, "label": task["label"]},
        )


def _seed_aspects(conn) -> None:
    data = yaml.safe_load((GLOBALS_DIR / "aspects.yaml").read_text())
    for aspect_id, aspect in data["aspects"].items():
        conn.execute(
            text("""
                INSERT INTO aspects (id, label) VALUES (:id, :label)
                ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label
            """),
            {"id": aspect_id, "label": aspect["label"]},
        )


def _seed_metrics(conn) -> None:
    data = yaml.safe_load((GLOBALS_DIR / "metrics.yaml").read_text())
    for metric_id, metric in data["metrics"].items():
        infra = metric.get("supported_infrastructure", {})
        conn.execute(
            text("""
                INSERT INTO metrics (
                    id, label, description, tags,
                    supported_compute_environments, supported_reference_modes
                )
                VALUES (
                    :id, :label, :description, :tags, :compute, :reference
                )
                ON CONFLICT (id) DO UPDATE SET
                    label       = EXCLUDED.label,
                    description = EXCLUDED.description,
                    tags        = EXCLUDED.tags,
                    supported_compute_environments = EXCLUDED.supported_compute_environments,
                    supported_reference_modes      = EXCLUDED.supported_reference_modes
            """),
            {
                "id": metric_id,
                "label": metric["label"],
                "description": metric.get("description"),
                "tags": metric.get("tags", []),
                "compute": infra.get("compute_environment", []),
                "reference": infra.get("reference_mode", []),
            },
        )


def _ensure_aspect(conn, aspect_id: str) -> None:
    """Insert a stub aspect row if it is referenced by a path but not in aspects.yaml."""
    conn.execute(
        text("""
            INSERT INTO aspects (id, label) VALUES (:id, :label)
            ON CONFLICT (id) DO NOTHING
        """),
        {"id": aspect_id, "label": aspect_id.replace("_", " ").title()},
    )


def _ensure_metric(conn, metric_id: str) -> None:
    """Insert a stub metric row if it is referenced by a path but not in metrics.yaml."""
    conn.execute(
        text("""
            INSERT INTO metrics (id, label) VALUES (:id, :label)
            ON CONFLICT (id) DO NOTHING
        """),
        {"id": metric_id, "label": metric_id},
    )


def _seed_paths(conn) -> None:
    index = yaml.safe_load((PATHS_DIR / "index.yaml").read_text())

    for entry in index["paths"]:
        path_file = PATHS_DIR / entry["file"]
        path_data = yaml.safe_load(path_file.read_text())
        ds = path_data.get("data_source", {})

        conn.execute(
            text("""
                INSERT INTO paths (
                    id, use_case_id, task_id,
                    data_source_id, data_source_label, data_source_description
                )
                VALUES (
                    :id, :use_case_id, :task_id,
                    :data_source_id, :data_source_label, :data_source_description
                )
                ON CONFLICT (id) DO UPDATE SET
                    use_case_id             = EXCLUDED.use_case_id,
                    task_id                 = EXCLUDED.task_id,
                    data_source_id          = EXCLUDED.data_source_id,
                    data_source_label       = EXCLUDED.data_source_label,
                    data_source_description = EXCLUDED.data_source_description
            """),
            {
                "id": path_data["id"],
                "use_case_id": path_data["use_case"],
                "task_id": path_data["task"],
                "data_source_id": ds.get("id") or entry["data_source"],
                "data_source_label": ds.get("label") or entry["data_source_label"],
                "data_source_description": ds.get("description"),
            },
        )

        for order, (aspect_id, aspect_data) in enumerate(
            path_data.get("aspects", {}).items()
        ):
            _ensure_aspect(conn, aspect_id)

            pa_id = conn.execute(
                text("""
                    INSERT INTO path_aspects (
                        path_id, aspect_id, definition, sort_order,
                        examples, stakeholder_requirements
                    )
                    VALUES (
                        :path_id, :aspect_id, :definition, :sort_order,
                        CAST(:examples AS jsonb), CAST(:stakeholder_requirements AS jsonb)
                    )
                    ON CONFLICT (path_id, aspect_id) DO UPDATE SET
                        definition               = EXCLUDED.definition,
                        sort_order               = EXCLUDED.sort_order,
                        examples                 = EXCLUDED.examples,
                        stakeholder_requirements = EXCLUDED.stakeholder_requirements
                    RETURNING id
                """),
                {
                    "path_id": path_data["id"],
                    "aspect_id": aspect_id,
                    "definition": aspect_data.get("definition", ""),
                    "sort_order": order,
                    "examples": (
                        json.dumps(aspect_data["examples"])
                        if aspect_data.get("examples")
                        else None
                    ),
                    "stakeholder_requirements": (
                        json.dumps(aspect_data["stakeholder_requirements"])
                        if aspect_data.get("stakeholder_requirements")
                        else None
                    ),
                },
            ).scalar_one()

            for metric_id in aspect_data.get("metrics") or []:
                _ensure_metric(conn, metric_id)
                conn.execute(
                    text("""
                        INSERT INTO path_aspect_metrics (path_aspect_id, metric_id)
                        VALUES (:pa_id, :metric_id)
                        ON CONFLICT DO NOTHING
                    """),
                    {"pa_id": pa_id, "metric_id": metric_id},
                )


# ── Results seed ──────────────────────────────────────────────────────────────


def seed_results(conn) -> None:
    for json_file, path_id in RESULT_FILES:
        if not json_file.exists():
            print(f"  Skipping {json_file.name} (file not found)")
            continue
        print(f"  Loading {json_file.name} …")
        _seed_result_file(conn, json_file, path_id)


def _seed_result_file(conn, json_file: Path, path_id: str) -> None:
    raw = json.loads(json_file.read_text())
    meta = raw["metadata"]
    data = raw["data"]

    # ── evaluation_run ────────────────────────────────────────────────────────
    run_id = conn.execute(
        text("""
            INSERT INTO evaluation_runs (path_id, title)
            VALUES (:path_id, :title)
            ON CONFLICT (path_id, title) DO NOTHING
            RETURNING id
        """),
        {
            "path_id": path_id,
            "title": meta.get("title", json_file.stem),
        },
    ).scalar_one_or_none()
    if run_id is None:
        run_id = conn.execute(
            text("SELECT id FROM evaluation_runs WHERE path_id = :p AND title = :t"),
            {"p": path_id, "t": meta.get("title", json_file.stem)},
        ).scalar_one()

    # ── datasets / models / metrics ───────────────────────────────────────────
    dataset_ids = _upsert_names(conn, "datasets", meta["datasets"])
    model_ids = _upsert_names(conn, "models", meta["models"])

    for ds_id in dataset_ids.values():
        conn.execute(
            text("INSERT INTO run_datasets VALUES (:r,:d) ON CONFLICT DO NOTHING"),
            {"r": run_id, "d": ds_id},
        )
    for m_id in model_ids.values():
        conn.execute(
            text("INSERT INTO run_models VALUES (:r,:m) ON CONFLICT DO NOTHING"),
            {"r": run_id, "m": m_id},
        )
    for metric_id in meta.get("metrics", []):
        _ensure_metric(conn, metric_id)
        conn.execute(
            text("INSERT INTO run_metrics (run_id, metric_id) VALUES (:r, :m) ON CONFLICT DO NOTHING"),
            {"r": run_id, "m": metric_id},
        )

    # ── per-dataset results ───────────────────────────────────────────────────
    for dataset_name, dataset_data in data.items():
        dataset_id = dataset_ids[dataset_name]
        gold_summaries: dict[str, str] = dataset_data.get("gold_summary", {})

        # Upsert documents (gold summary is shared across all models in a dataset).
        doc_ids: dict[str, int] = {}
        for ext_id, gold_text in gold_summaries.items():
            doc_id = conn.execute(
                text("""
                    INSERT INTO documents (dataset_id, external_id, gold_summary)
                    VALUES (:dataset_id, :ext_id, :gold)
                    ON CONFLICT (dataset_id, external_id)
                        DO UPDATE SET gold_summary = EXCLUDED.gold_summary
                    RETURNING id
                """),
                {"dataset_id": dataset_id, "ext_id": ext_id, "gold": gold_text},
            ).scalar_one()
            doc_ids[ext_id] = doc_id

        # ── per-model results ─────────────────────────────────────────────────
        for model_name in meta["models"]:
            if model_name not in dataset_data:
                continue
            model_data = dataset_data[model_name]
            model_id = model_ids[model_name]

            # document_ids list drives positional alignment of document_level scores.
            # Use explicit field if present, else fall back to llm_summary key order.
            llm_summaries: dict[str, str] = model_data.get("llm_summary", {})
            ordered_ext_ids: list[str] = model_data.get(
                "document_ids", list(llm_summaries.keys())
            )
            inputs: dict = model_data.get("inputs", {})

            # model_outputs
            for ext_id, summary in llm_summaries.items():
                doc_id = doc_ids.get(ext_id)
                if doc_id is None:
                    continue
                conn.execute(
                    text("""
                        INSERT INTO model_outputs
                            (run_id, document_id, model_id, llm_summary, input)
                        VALUES (:run_id, :doc_id, :model_id, :summary, CAST(:input AS jsonb))
                        ON CONFLICT (run_id, document_id, model_id)
                            DO UPDATE SET
                                llm_summary = EXCLUDED.llm_summary,
                                input       = EXCLUDED.input
                    """),
                    {
                        "run_id": run_id,
                        "doc_id": doc_id,
                        "model_id": model_id,
                        "summary": summary,
                        "input": json.dumps(inputs[ext_id]) if ext_id in inputs else None,
                    },
                )

            # metric scores
            for metric_id in meta.get("metrics", []):
                if metric_id not in model_data:
                    continue
                metric_data = model_data[metric_id]
                mean_score = metric_data.get("mean")
                if mean_score is None:
                    continue

                ms_id = conn.execute(
                    text("""
                        INSERT INTO metric_scores
                            (run_id, dataset_id, model_id, metric_id, mean_score)
                        VALUES (:run_id, :ds_id, :model_id, :metric_id, :mean)
                        ON CONFLICT (run_id, dataset_id, model_id, metric_id)
                            DO UPDATE SET mean_score = EXCLUDED.mean_score
                        RETURNING id
                    """),
                    {
                        "run_id": run_id,
                        "ds_id": dataset_id,
                        "model_id": model_id,
                        "metric_id": metric_id,
                        "mean": mean_score,
                    },
                ).scalar_one()

                doc_level: list[float] = metric_data.get("document_level", [])
                detail: list = metric_data.get("detail", [])

                for i, ext_id in enumerate(ordered_ext_ids):
                    if i >= len(doc_level):
                        break
                    doc_id = doc_ids.get(ext_id)
                    if doc_id is None:
                        continue
                    sent_detail = detail[i] if i < len(detail) else None
                    conn.execute(
                        text("""
                            INSERT INTO document_metric_scores
                                (metric_score_id, document_id, score, sentence_detail)
                            VALUES (:ms_id, :doc_id, :score, CAST(:detail AS jsonb))
                            ON CONFLICT (metric_score_id, document_id)
                                DO UPDATE SET
                                    score           = EXCLUDED.score,
                                    sentence_detail = EXCLUDED.sentence_detail
                        """),
                        {
                            "ms_id": ms_id,
                            "doc_id": doc_id,
                            "score": doc_level[i],
                            "detail": (
                                json.dumps(sent_detail)
                                if sent_detail is not None
                                else None
                            ),
                        },
                    )


def _upsert_names(conn, table: str, names: list[str]) -> dict[str, int]:
    """Upsert a list of names into a (id SERIAL, name TEXT UNIQUE) table."""
    result: dict[str, int] = {}
    for name in names:
        row_id = conn.execute(
            text(f"""
                INSERT INTO {table} (name) VALUES (:name)
                ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
            """),
            {"name": name},
        ).scalar_one()
        result[name] = row_id
    return result


# ── Entry point ───────────────────────────────────────────────────────────────


def main() -> None:
    url = get_database_url()
    try:
        engine = create_engine(url)
        with engine.begin() as conn:
            print("Creating schema …")
            create_schema(conn)
            print("Schema ready.")

            print("Seeding config (use cases, tasks, aspects, metrics, paths) …")
            seed_config(conn)
            print("Config seeded.")

            print("Seeding evaluation results …")
            seed_results(conn)
            print("Results seeded.")

        print("\nMigration complete.")
    except OperationalError as exc:
        raise SystemExit(
            f"Could not connect to PostgreSQL at {url}.\n"
            "Set DATABASE_URL with explicit credentials if needed.\n"
            f"Detail: {exc}"
        ) from exc


if __name__ == "__main__":
    main()
