"""Test query: pull all evaluation data for the multi-modal medical diagnostics use case.

Mirrors the data shape the frontend dashboard consumes:
  - run metadata (title, datasets, models, metrics)
  - mean metric scores per (dataset, model, metric)
  - per-document scores and sentence-level detail
  - gold summaries and LLM outputs per document

Usage:
    python test_query_medical.py
    DATABASE_URL=postgresql+psycopg2://user@host/db python test_query_medical.py
"""

from __future__ import annotations

import getpass
import json
import os
from collections import defaultdict

from sqlalchemy import create_engine, text

PATH_ID = "medical_diagnostics_chest_xray_report_generation"


def get_database_url() -> str:
    default_user = getpass.getuser()
    return os.environ.get(
        "DATABASE_URL",
        f"postgresql+psycopg2://{default_user}@localhost:5432/adsolve",
    )


def main() -> None:
    engine = create_engine(get_database_url())

    with engine.connect() as conn:

        # ── Run metadata ──────────────────────────────────────────────────────
        run = conn.execute(
            text("""
                SELECT er.id, er.title, er.description, er.created_at,
                       uc.label AS use_case_label,
                       t.label  AS task_label,
                       p.data_source_label
                FROM   evaluation_runs er
                JOIN   paths    p  ON p.id = er.path_id
                JOIN   use_cases uc ON uc.id = p.use_case_id
                JOIN   tasks     t  ON t.id  = p.task_id
                WHERE  er.path_id = :path_id
            """),
            {"path_id": PATH_ID},
        ).mappings().one()

        run_id = run["id"]

        print("=" * 70)
        print(f"  {run['title']}")
        print(f"  Use case : {run['use_case_label']}")
        print(f"  Task     : {run['task_label']}")
        print(f"  Dataset  : {run['data_source_label']}")
        print(f"  Created  : {run['created_at']}")
        print(f"  Desc     : {run['description']}")
        print("=" * 70)

        # ── Datasets / models / metrics in this run ───────────────────────────
        datasets = conn.execute(
            text("""
                SELECT d.id, d.name
                FROM   run_datasets rd
                JOIN   datasets d ON d.id = rd.dataset_id
                WHERE  rd.run_id = :run_id
                ORDER  BY d.name
            """),
            {"run_id": run_id},
        ).mappings().all()

        models = conn.execute(
            text("""
                SELECT m.id, m.name
                FROM   run_models rm
                JOIN   models m ON m.id = rm.model_id
                WHERE  rm.run_id = :run_id
                ORDER  BY m.name
            """),
            {"run_id": run_id},
        ).mappings().all()

        metrics = conn.execute(
            text("""
                SELECT rm.metric_id, rm.display_label, m.description
                FROM   run_metrics rm
                JOIN   metrics m ON m.id = rm.metric_id
                WHERE  rm.run_id = :run_id
                ORDER  BY rm.metric_id
            """),
            {"run_id": run_id},
        ).mappings().all()

        print(f"\nDatasets ({len(datasets)}): {', '.join(r['name'] for r in datasets)}")
        print(f"Models   ({len(models)}):   {', '.join(r['name'] for r in models)}")
        print(f"Metrics  ({len(metrics)}):  {', '.join(r['metric_id'] for r in metrics)}")

        # ── Mean scores — leaderboard view ────────────────────────────────────
        print("\n── Mean scores (dataset × model × metric) " + "─" * 27)

        mean_scores = conn.execute(
            text("""
                SELECT d.name  AS dataset,
                       m.name  AS model,
                       ms.metric_id,
                       ms.mean_score
                FROM   metric_scores ms
                JOIN   datasets d ON d.id = ms.dataset_id
                JOIN   models   m ON m.id = ms.model_id
                WHERE  ms.run_id = :run_id
                ORDER  BY d.name, ms.metric_id, ms.mean_score DESC
            """),
            {"run_id": run_id},
        ).mappings().all()

        # Group by dataset → metric for a compact leaderboard printout
        grouped: dict[str, dict[str, list]] = defaultdict(lambda: defaultdict(list))
        for row in mean_scores:
            grouped[row["dataset"]][row["metric_id"]].append(
                (row["model"], row["mean_score"])
            )

        for dataset_name, metric_rows in grouped.items():
            print(f"\n  Dataset: {dataset_name}")
            for metric_id, entries in metric_rows.items():
                display = next(
                    (r["display_label"] for r in metrics if r["metric_id"] == metric_id),
                    metric_id,
                )
                print(f"    {display}")
                for model_name, score in entries:
                    print(f"      {model_name:<35}  {score:.4f}")

        # ── Per-document scores (first dataset, first metric) ─────────────────
        first_dataset = datasets[0]
        first_metric = metrics[0]

        print(
            f"\n── Per-document scores  "
            f"[dataset={first_dataset['name']}  metric={first_metric['metric_id']}]"
            + " ─" * 10
        )

        doc_scores = conn.execute(
            text("""
                SELECT doc.external_id,
                       m.name           AS model,
                       dms.score,
                       doc.gold_summary,
                       mo.llm_summary,
                       dms.sentence_detail
                FROM   document_metric_scores dms
                JOIN   metric_scores ms   ON ms.id  = dms.metric_score_id
                JOIN   documents     doc  ON doc.id = dms.document_id
                JOIN   models        m    ON m.id   = ms.model_id
                LEFT   JOIN model_outputs mo
                            ON mo.run_id      = ms.run_id
                           AND mo.document_id = dms.document_id
                           AND mo.model_id    = ms.model_id
                WHERE  ms.run_id     = :run_id
                AND    ms.dataset_id = :dataset_id
                AND    ms.metric_id  = :metric_id
                ORDER  BY doc.external_id, m.name
            """),
            {
                "run_id": run_id,
                "dataset_id": first_dataset["id"],
                "metric_id": first_metric["metric_id"],
            },
        ).mappings().all()

        for row in doc_scores:
            print(f"\n  doc={row['external_id']}  model={row['model']}  score={row['score']:.4f}")
            gold = (row["gold_summary"] or "")[:120].replace("\n", " ")
            llm  = (row["llm_summary"]  or "")[:120].replace("\n", " ")
            print(f"    gold : {gold}…")
            print(f"    llm  : {llm}…")
            if row["sentence_detail"]:
                detail = row["sentence_detail"]
                if isinstance(detail, str):
                    detail = json.loads(detail)
                sents  = detail.get("sents", [])
                scores = detail.get("scores", [])
                print(f"    sentence detail ({len(sents)} sents):")
                for sent, sc in zip(sents[:2], scores[:2]):
                    print(f"      [{sc:.4f}] {sent[:90]}…")

        # ── Config: path aspects and metrics ──────────────────────────────────
        print("\n── Path config (aspects + recommended metrics) " + "─" * 23)

        aspects = conn.execute(
            text("""
                SELECT a.label        AS aspect,
                       pa.definition,
                       array_agg(pam.metric_id ORDER BY pam.metric_id) AS metric_ids
                FROM   path_aspects pa
                JOIN   aspects a ON a.id = pa.aspect_id
                LEFT   JOIN path_aspect_metrics pam ON pam.path_aspect_id = pa.id
                WHERE  pa.path_id = :path_id
                GROUP  BY a.label, pa.definition, pa.sort_order
                ORDER  BY pa.sort_order
            """),
            {"path_id": PATH_ID},
        ).mappings().all()

        for asp in aspects:
            print(f"\n  [{asp['aspect']}]")
            print(f"    {asp['definition'][:100]}…")
            print(f"    metrics: {', '.join(asp['metric_ids'] or [])}")

    print("\nDone.")


if __name__ == "__main__":
    main()
