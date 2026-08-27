"""Writes a parsed evaluation run into the platform database."""

from __future__ import annotations

import json
from typing import Any, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from .parser import IngestValidationError, ParsedRun
from .schemas import IngestRequest


def known_metric_ids(db: Session) -> set[str]:
    """Every metric id currently in the catalog."""
    return set(db.execute(text("SELECT id FROM metrics")).scalars().all())


def _as_jsonb(value: Any) -> Optional[str]:
    """Serialise a value for a JSONB column, preserving SQL NULL for None."""
    return None if value is None else json.dumps(value)


def _upsert_dataset(db: Session, name: str, sensitive: bool) -> int:
    """Insert the dataset, or fetch it — refusing to change an existing flag.

    Flipping `sensitive` here would leave text from earlier runs in place while
    reporting the dataset as sensitive, which is a false guarantee. Changing the
    flag has to be a deliberate decision that also purges existing content, so
    ingest refuses rather than doing it silently.
    """
    existing = db.execute(
        text("SELECT id, sensitive FROM datasets WHERE name = :name"),
        {"name": name},
    ).mappings().one_or_none()

    if existing is not None:
        if existing["sensitive"] != sensitive:
            raise IngestValidationError([
                f"Dataset '{name}' already exists with sensitive="
                f"{existing['sensitive']}; ingest will not change it to {sensitive}. "
                "Runs already stored for this dataset would keep their text. "
                "Use a different dataset name, or change the flag deliberately."
            ])
        return existing["id"]

    return db.execute(
        text("""
            INSERT INTO datasets (name, sensitive) VALUES (:name, :sensitive)
            RETURNING id
        """),
        {"name": name, "sensitive": sensitive},
    ).scalar_one()


def _upsert_model(db: Session, name: str) -> int:
    return db.execute(
        text("""
            INSERT INTO models (name) VALUES (:name)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """),
        {"name": name},
    ).scalar_one()


def _upsert_run(db: Session, request: IngestRequest) -> int:
    return db.execute(
        text("""
            INSERT INTO evaluation_runs (path_id, title, notes)
            VALUES (:path_id, :title, :notes)
            ON CONFLICT (path_id, title) DO UPDATE SET notes = EXCLUDED.notes
            RETURNING id
        """),
        {
            "path_id": request.path_id,
            "title": request.title,
            "notes": request.notes,
        },
    ).scalar_one()


def _clear_previous_results(db: Session, run_id: int) -> None:
    """Remove a previous ingest's rows so re-ingesting cannot leave stale data.

    document_metric_scores is removed by cascade from metric_scores. The
    run_datasets / run_models links go too: re-ingesting after correcting a
    mistyped dataset or model name would otherwise leave the old link behind,
    showing a dashboard entry with no scores behind it. _link_run re-inserts
    both immediately afterwards, so clearing them here is safe.
    """
    for statement in (
        "DELETE FROM metric_scores WHERE run_id = :run_id",
        "DELETE FROM model_outputs WHERE run_id = :run_id",
        "DELETE FROM run_metrics WHERE run_id = :run_id",
        "DELETE FROM run_datasets WHERE run_id = :run_id",
        "DELETE FROM run_models WHERE run_id = :run_id",
    ):
        db.execute(text(statement), {"run_id": run_id})


def _link_run(db: Session, run_id: int, dataset_id: int, model_id: int) -> None:
    db.execute(
        text("""
            INSERT INTO run_datasets (run_id, dataset_id) VALUES (:run_id, :dataset_id)
            ON CONFLICT DO NOTHING
        """),
        {"run_id": run_id, "dataset_id": dataset_id},
    )
    db.execute(
        text("""
            INSERT INTO run_models (run_id, model_id) VALUES (:run_id, :model_id)
            ON CONFLICT DO NOTHING
        """),
        {"run_id": run_id, "model_id": model_id},
    )


def _upsert_documents(
    db: Session, dataset_id: int, parsed: ParsedRun, sensitive: bool
) -> dict[str, int]:
    """Insert a row per document, returning external_id -> documents.id."""
    document_ids: dict[str, int] = {}
    for document in parsed.documents:
        gold = None if sensitive else document.gold_summary
        document_ids[document.external_id] = db.execute(
            text("""
                INSERT INTO documents (dataset_id, external_id, gold_summary)
                VALUES (:dataset_id, :external_id, :gold_summary)
                ON CONFLICT (dataset_id, external_id)
                    DO UPDATE SET gold_summary = EXCLUDED.gold_summary
                RETURNING id
            """),
            {
                "dataset_id": dataset_id,
                "external_id": document.external_id,
                "gold_summary": gold,
            },
        ).scalar_one()
    return document_ids


def _write_model_outputs(
    db: Session,
    run_id: int,
    model_id: int,
    parsed: ParsedRun,
    document_ids: dict[str, int],
    sensitive: bool,
) -> None:
    """Write one row per supplied model output, blanking text when sensitive."""
    for output in parsed.model_outputs:
        document_id = document_ids.get(output.external_id)
        if document_id is None:
            continue
        db.execute(
            text("""
                INSERT INTO model_outputs
                    (run_id, document_id, model_id, llm_summary, input)
                VALUES
                    (:run_id, :document_id, :model_id, :llm_summary,
                     CAST(:input AS jsonb))
            """),
            {
                "run_id": run_id,
                "document_id": document_id,
                "model_id": model_id,
                "llm_summary": None if sensitive else output.llm_summary,
                "input": None if sensitive else _as_jsonb(output.input),
            },
        )


def _write_scores(
    db: Session,
    run_id: int,
    dataset_id: int,
    model_id: int,
    parsed: ParsedRun,
    document_ids: dict[str, int],
    sensitive: bool,
) -> None:
    """Write mean and per-document scores, dropping sentence detail when sensitive."""
    for metric in parsed.metric_scores:
        db.execute(
            text("""
                INSERT INTO run_metrics (run_id, metric_id) VALUES (:run_id, :metric_id)
                ON CONFLICT DO NOTHING
            """),
            {"run_id": run_id, "metric_id": metric.metric_id},
        )

        metric_score_id = db.execute(
            text("""
                INSERT INTO metric_scores
                    (run_id, dataset_id, model_id, metric_id, mean_score)
                VALUES (:run_id, :dataset_id, :model_id, :metric_id, :mean_score)
                RETURNING id
            """),
            {
                "run_id": run_id,
                "dataset_id": dataset_id,
                "model_id": model_id,
                "metric_id": metric.metric_id,
                "mean_score": metric.mean_score,
            },
        ).scalar_one()

        for document_score in metric.document_scores:
            document_id = document_ids.get(document_score.external_id)
            if document_id is None:
                continue
            detail = None if sensitive else document_score.sentence_detail
            db.execute(
                text("""
                    INSERT INTO document_metric_scores
                        (metric_score_id, document_id, score, sentence_detail)
                    VALUES (:metric_score_id, :document_id, :score,
                            CAST(:sentence_detail AS jsonb))
                """),
                {
                    "metric_score_id": metric_score_id,
                    "document_id": document_id,
                    "score": document_score.score,
                    "sentence_detail": _as_jsonb(detail),
                },
            )


def write_run(db: Session, request: IngestRequest, parsed: ParsedRun) -> int:
    """Persist a parsed run and return its id. The caller owns the transaction."""
    sensitive = request.dataset.sensitive

    dataset_id = _upsert_dataset(db, request.dataset.name, sensitive)
    model_id = _upsert_model(db, request.model.name)
    run_id = _upsert_run(db, request)

    # Re-ingest clears the WHOLE run, which is what "re-uploading corrects a bad
    # upload" needs. But runs can hold results for several models (the seeded
    # bundles do), so a title collision with a differently-modelled run would
    # silently delete the other models' results. Refuse it instead.
    other_models = db.execute(
        text("""
            SELECT m.name FROM run_models rm
            JOIN models m ON m.id = rm.model_id
            WHERE rm.run_id = :run_id AND rm.model_id <> :model_id
        """),
        {"run_id": run_id, "model_id": model_id},
    ).scalars().all()
    if other_models:
        raise IngestValidationError([
            f"Run '{request.title}' already holds results for "
            f"{', '.join(other_models)}. Re-ingesting would delete them. "
            "Use a different run title."
        ])

    _clear_previous_results(db, run_id)
    _link_run(db, run_id, dataset_id, model_id)

    document_ids = _upsert_documents(db, dataset_id, parsed, sensitive)
    _write_model_outputs(db, run_id, model_id, parsed, document_ids, sensitive)
    _write_scores(db, run_id, dataset_id, model_id, parsed, document_ids, sensitive)

    return run_id
