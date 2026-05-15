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
) -> list[DocumentListItem]:
    """Return all documents associated with a run, optionally filtered by dataset."""
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
def get_document(
    run_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
) -> DocumentDetail:
    """Return full detail for a single document, including per-model outputs and scores."""
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

    # Group scores by model name, accumulating metric scores for each
    outputs_by_model: dict[str, dict] = {}
    for row in score_rows:
        model_name = row["model_name"]
        if model_name not in outputs_by_model:
            outputs_by_model[model_name] = {
                "model": model_name,
                "llm_summary": row["llm_summary"],
                "scores": {},
            }
        # JSONB may arrive as a dict (psycopg2 auto-parses) or as a JSON string
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
