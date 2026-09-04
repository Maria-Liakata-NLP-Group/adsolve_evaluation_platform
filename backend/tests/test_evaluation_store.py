"""Job-row bookkeeping for calculations submitted to the metric API."""

from collections.abc import Iterator

import pytest
from sqlalchemy import text as sql_text
from sqlalchemy.orm import Session

from api.db import _SessionLocal
from api.evaluation import store

TEST_PATH_ID = "evaluation_store_test_path"
JOB_ID = "11111111-1111-1111-1111-111111111111"


def _cleanup() -> None:
    session = _SessionLocal()
    session.execute(
        sql_text("DELETE FROM evaluation_jobs WHERE path_id = :p"), {"p": TEST_PATH_ID}
    )
    session.execute(sql_text("DELETE FROM paths WHERE id = :id"), {"id": TEST_PATH_ID})
    session.commit()
    session.close()


@pytest.fixture(autouse=True)
def db() -> Iterator[Session]:
    """A throwaway path plus a session, both torn down after each test."""
    _cleanup()
    session = _SessionLocal()
    session.execute(sql_text("""
        INSERT INTO paths (id, use_case_id, task_id, data_source_id, data_source_label)
        SELECT :id, use_case_id, task_id, 'evaluation_store_source', 'Store Test Source'
        FROM paths WHERE id <> :id ORDER BY id LIMIT 1
        ON CONFLICT (id) DO NOTHING
    """), {"id": TEST_PATH_ID})
    session.commit()
    yield session
    session.close()
    _cleanup()


def _create(db: Session) -> None:
    store.create_job(db, JOB_ID, TEST_PATH_ID, "Baseline run", "some notes")
    db.commit()


def test_created_job_starts_queued(db: Session) -> None:
    _create(db)
    job = store.get_job(db, JOB_ID)
    assert job is not None
    assert job["status"] == "queued"
    assert job["title"] == "Baseline run"
    assert job["run_id"] is None


def test_created_job_has_no_metric_job_id_until_the_api_responds(db: Session) -> None:
    _create(db)
    assert store.get_job(db, JOB_ID)["metric_job_id"] is None


def test_get_job_returns_none_for_an_unknown_id(db: Session) -> None:
    assert store.get_job(db, "no-such-job") is None


def test_records_the_metric_api_job_id(db: Session) -> None:
    _create(db)
    store.set_metric_job_id(db, JOB_ID, "api-side-uuid")
    db.commit()
    assert store.get_job(db, JOB_ID)["metric_job_id"] == "api-side-uuid"


def test_failure_records_status_and_error(db: Session) -> None:
    _create(db)
    store.set_status(db, JOB_ID, "failed", error="CUDA out of memory")
    db.commit()
    job = store.get_job(db, JOB_ID)
    assert job["status"] == "failed"
    assert job["error"] == "CUDA out of memory"


def test_terminal_status_stamps_finished_at(db: Session) -> None:
    _create(db)
    assert store.get_job(db, JOB_ID)["finished_at"] is None
    store.set_status(db, JOB_ID, "failed", error="boom")
    db.commit()
    assert store.get_job(db, JOB_ID)["finished_at"] is not None


def test_running_status_does_not_stamp_finished_at(db: Session) -> None:
    _create(db)
    store.set_status(db, JOB_ID, "running")
    db.commit()
    assert store.get_job(db, JOB_ID)["finished_at"] is None


def test_linking_a_run_marks_the_job_succeeded(db: Session) -> None:
    _create(db)
    run_id = db.execute(sql_text("""
        INSERT INTO evaluation_runs (path_id, title) VALUES (:p, 'Store test run')
        RETURNING id
    """), {"p": TEST_PATH_ID}).scalar_one()
    store.link_run(db, JOB_ID, run_id)
    db.commit()

    job = store.get_job(db, JOB_ID)
    assert job["run_id"] == run_id
    assert job["status"] == "succeeded"
    assert job["finished_at"] is not None

    db.execute(sql_text("DELETE FROM evaluation_runs WHERE id = :i"), {"i": run_id})
    db.commit()


def test_delete_removes_the_row(db: Session) -> None:
    _create(db)
    store.delete_job(db, JOB_ID)
    db.commit()
    assert store.get_job(db, JOB_ID) is None
