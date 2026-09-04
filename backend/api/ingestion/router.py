"""HTTP endpoint for ingesting completed evaluation results."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..routers.config import require_admin
from .schemas import IngestRequest
from .service import create_run_from_ingest

router = APIRouter(prefix="/api")


@router.post(
    "/runs/ingest",
    status_code=201,
    dependencies=[Depends(require_admin)],
)
def ingest_run(body: IngestRequest, db: Session = Depends(get_db)) -> dict[str, int]:
    """Persist a completed evaluation and return the id of the run it created."""
    return {"run_id": create_run_from_ingest(body, db)}
