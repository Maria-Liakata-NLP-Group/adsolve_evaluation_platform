from collections.abc import Iterator
from typing import Any

import pytest
from sqlalchemy import text as sql_text
from sqlalchemy.orm import Session

from api.db import _SessionLocal
from api.ingestion.parser import parse_run
from api.ingestion.schemas import IngestRequest
from api.ingestion.writer import known_metric_ids, write_run

TEST_PATH_ID = "ingestion_writer_test_path"
TEST_TITLE = "Ingestion writer test run"
TEST_DATASET = "Ingestion writer test dataset"
TEST_MODEL = "Ingestion writer test model"


def _body(sensitive: bool = False) -> dict[str, Any]:
    return {
        "path_id": TEST_PATH_ID,
        "title": TEST_TITLE,
        "notes": "written by the test suite",
        "dataset": {"name": TEST_DATASET, "sensitive": sensitive},
        "model": {"name": TEST_MODEL},
        "gold_summaries": {"doc-a": "gold text"},
        "llm_summaries": {"doc-a": "generated text"},
        "inputs": {"doc-a": ["raw source turn"]},
        "results": {
            "document_ids": ["doc-a", "doc-b"],
            "fc_document": {
                "mean": 0.5,
                "document_level": [0.4, 0.6],
                "detail": [
                    {"scores": [0.4], "sentences": ["first"]},
                    {"scores": [0.6], "sentences": ["second"]},
                ],
            },
        },
    }


def _create_test_path(db: Session) -> None:
    """Create a throwaway path, borrowing use_case_id/task_id from an existing one.

    The tests must never depend on, or mutate, whichever paths happen to exist in
    the development database.
    """
    db.execute(sql_text("""
        INSERT INTO paths (id, use_case_id, task_id, data_source_id, data_source_label)
        SELECT :id, use_case_id, task_id, 'ingestion_test_source', 'Ingestion Test Source'
        FROM paths WHERE id <> :id ORDER BY id LIMIT 1
        ON CONFLICT (id) DO NOTHING
    """), {"id": TEST_PATH_ID})
    db.commit()


def _cleanup(db: Session) -> None:
    """Remove every row the test could have created, in FK-safe order."""
    db.execute(sql_text("DELETE FROM evaluation_runs WHERE title = :t"), {"t": TEST_TITLE})
    db.execute(sql_text("""
        DELETE FROM documents
        WHERE dataset_id IN (SELECT id FROM datasets WHERE name = :d)
    """), {"d": TEST_DATASET})
    db.execute(sql_text("DELETE FROM datasets WHERE name = :d"), {"d": TEST_DATASET})
    db.execute(sql_text("DELETE FROM models WHERE name = :m"), {"m": TEST_MODEL})
    db.execute(sql_text("DELETE FROM paths WHERE id = :id"), {"id": TEST_PATH_ID})
    db.commit()


@pytest.fixture
def db() -> Iterator[Session]:
    session = _SessionLocal()
    _cleanup(session)
    _create_test_path(session)
    yield session
    _cleanup(session)
    session.close()


def _ingest(db: Session, sensitive: bool = False) -> int:
    request = IngestRequest.model_validate(_body(sensitive=sensitive))
    parsed = parse_run(request, known_metric_ids(db))
    run_id = write_run(db, request, parsed)
    db.commit()
    return run_id


def test_known_metric_ids_includes_catalog_entries(db: Session) -> None:
    ids = known_metric_ids(db)

    assert "fc_document" in ids
    assert "not_a_real_metric" not in ids


def test_write_run_creates_the_run(db: Session) -> None:
    run_id = _ingest(db)

    row = db.execute(sql_text(
        "SELECT path_id, title, notes FROM evaluation_runs WHERE id = :id"
    ), {"id": run_id}).mappings().one()
    assert row["path_id"] == TEST_PATH_ID
    assert row["title"] == TEST_TITLE
    assert row["notes"] == "written by the test suite"


def test_write_run_links_dataset_model_and_metrics(db: Session) -> None:
    run_id = _ingest(db)

    dataset_names = db.execute(sql_text("""
        SELECT d.name FROM run_datasets rd JOIN datasets d ON d.id = rd.dataset_id
        WHERE rd.run_id = :id
    """), {"id": run_id}).scalars().all()
    model_names = db.execute(sql_text("""
        SELECT m.name FROM run_models rm JOIN models m ON m.id = rm.model_id
        WHERE rm.run_id = :id
    """), {"id": run_id}).scalars().all()
    metric_ids = db.execute(sql_text(
        "SELECT metric_id FROM run_metrics WHERE run_id = :id"
    ), {"id": run_id}).scalars().all()

    assert dataset_names == [TEST_DATASET]
    assert model_names == [TEST_MODEL]
    assert metric_ids == ["fc_document"]


def test_write_run_creates_a_document_row_per_id(db: Session) -> None:
    _ingest(db)

    rows = db.execute(sql_text("""
        SELECT doc.external_id, doc.gold_summary FROM documents doc
        JOIN datasets d ON d.id = doc.dataset_id
        WHERE d.name = :name ORDER BY doc.external_id
    """), {"name": TEST_DATASET}).mappings().all()

    assert [r["external_id"] for r in rows] == ["doc-a", "doc-b"]
    assert rows[0]["gold_summary"] == "gold text"
    assert rows[1]["gold_summary"] is None


def test_write_run_stores_scores_and_normalised_detail(db: Session) -> None:
    run_id = _ingest(db)

    mean = db.execute(sql_text(
        "SELECT mean_score FROM metric_scores WHERE run_id = :id"
    ), {"id": run_id}).scalar_one()
    details = db.execute(sql_text("""
        SELECT dms.score, dms.sentence_detail FROM document_metric_scores dms
        JOIN metric_scores ms ON ms.id = dms.metric_score_id
        JOIN documents doc ON doc.id = dms.document_id
        WHERE ms.run_id = :id ORDER BY doc.external_id
    """), {"id": run_id}).mappings().all()

    assert mean == 0.5
    assert [d["score"] for d in details] == [0.4, 0.6]
    assert details[0]["sentence_detail"] == {"scores": [0.4], "sents": ["first"]}


def test_sensitive_dataset_stores_scores_but_no_text(db: Session) -> None:
    run_id = _ingest(db, sensitive=True)

    gold = db.execute(sql_text("""
        SELECT doc.gold_summary FROM documents doc
        JOIN datasets d ON d.id = doc.dataset_id
        WHERE d.name = :name AND doc.external_id = 'doc-a'
    """), {"name": TEST_DATASET}).scalar_one()
    output = db.execute(sql_text(
        "SELECT llm_summary, input FROM model_outputs WHERE run_id = :id"
    ), {"id": run_id}).mappings().one()
    detail = db.execute(sql_text("""
        SELECT dms.sentence_detail FROM document_metric_scores dms
        JOIN metric_scores ms ON ms.id = dms.metric_score_id
        WHERE ms.run_id = :id LIMIT 1
    """), {"id": run_id}).scalar_one()
    scores = db.execute(sql_text("""
        SELECT dms.score FROM document_metric_scores dms
        JOIN metric_scores ms ON ms.id = dms.metric_score_id
        WHERE ms.run_id = :id
    """), {"id": run_id}).scalars().all()

    assert gold is None
    assert output["llm_summary"] is None
    assert output["input"] is None
    assert detail is None
    assert sorted(scores) == [0.4, 0.6]


def test_sensitive_dataset_flag_is_persisted(db: Session) -> None:
    _ingest(db, sensitive=True)

    sensitive = db.execute(sql_text(
        "SELECT sensitive FROM datasets WHERE name = :name"
    ), {"name": TEST_DATASET}).scalar_one()

    assert sensitive is True


def test_reingesting_updates_rather_than_duplicating(db: Session) -> None:
    first_run_id = _ingest(db)
    second_run_id = _ingest(db)

    run_count = db.execute(sql_text(
        "SELECT COUNT(*) FROM evaluation_runs WHERE title = :t"
    ), {"t": TEST_TITLE}).scalar_one()
    score_count = db.execute(sql_text(
        "SELECT COUNT(*) FROM metric_scores WHERE run_id = :id"
    ), {"id": second_run_id}).scalar_one()

    assert first_run_id == second_run_id
    assert run_count == 1
    assert score_count == 1
