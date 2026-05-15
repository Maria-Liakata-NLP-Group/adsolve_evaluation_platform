# Backend — Database Schema

PostgreSQL schema for the AdSoLve evaluation platform.
Run `migrate.py` to create tables and seed all data from the YAML/JSON files in `frontend/src/data/`.

```
pip install -r requirements.txt
python migrate.py
# or with explicit credentials:
DATABASE_URL=postgresql+psycopg2://user:pass@host/adsolve python migrate.py
```

The migration is **idempotent** — safe to re-run; existing rows are upserted.

---

## Overview

The schema has two logical domains:

```
┌─────────────────────────────────┐  ┌──────────────────────────────────────┐
│        CONFIG / CATALOG         │  │         EVALUATION RESULTS           │
│                                 │  │                                      │
│  Reference data seeded from     │  │  Run data seeded from JSON files     │
│  YAML files. Changes rarely.    │  │  (and eventually uploaded via UI).   │
│                                 │  │                                      │
│  use_cases  tasks  aspects      │  │  evaluation_runs  datasets  models   │
│  metrics  paths  path_aspects   │  │  documents  model_outputs            │
│  path_aspect_metrics            │  │  metric_scores  document_metric_scores│
└─────────────────────────────────┘  └──────────────────────────────────────┘
```

---

## Entity-Relationship Diagram

```
CONFIG DOMAIN
═════════════════════════════════════════════════════════════════════

 use_cases          tasks
 ──────────         ──────────
 id (PK)            id (PK)
 label              label
 description            │
      │                 │
      └────────┬─────────┘
               │
           paths
           ──────────────────────────
           id (PK)
           use_case_id  ──── use_cases.id
           task_id      ──── tasks.id
           data_source_id
           data_source_label
           data_source_description
               │
               │ 1
               │ *
          path_aspects
          ────────────────────────────────────────────────────
          id (PK)
          path_id     ──── paths.id
          aspect_id   ──── aspects.id
          definition
          sort_order
          examples                 ← JSONB
          stakeholder_requirements ← JSONB
               │
               │ 1
               │ *
     path_aspect_metrics
     ────────────────────────────
     path_aspect_id  ──── path_aspects.id
     metric_id       ──── metrics.id


 aspects            metrics
 ──────────         ────────────────────────────────
 id (PK)            id (PK)
 label              label
                    description
                    tags                           TEXT[]
                    supported_compute_environments TEXT[]
                    supported_reference_modes      TEXT[]


RESULTS DOMAIN
═════════════════════════════════════════════════════════════════════

 evaluation_runs
 ────────────────────────────────────────
 id (PK)
 path_id     ──── paths.id   (nullable)
 title
 description
 created_at
      │
      ├── run_datasets ──── datasets.id
      ├── run_models   ──── models.id
      └── run_metrics  ──── metrics.id  (+ display_label)


 datasets            models
 ──────────          ──────────
 id (PK)             id (PK)
 name                name
      │                   │
      │ 1                 │ 1
      │ *                 │ *
  documents           model_outputs
  ────────────────    ──────────────────────────────────
  id (PK)             id (PK)
  dataset_id          run_id      ──── evaluation_runs.id
  external_id         document_id ──── documents.id
  gold_summary        model_id    ──── models.id
  input  ← JSONB      llm_summary


 metric_scores
 ────────────────────────────────────────────────────
 id (PK)
 run_id      ──── evaluation_runs.id
 dataset_id  ──── datasets.id
 model_id    ──── models.id
 metric_id   ──── metrics.id
 mean_score
      │
      │ 1
      │ *
 document_metric_scores
 ────────────────────────────────────────────────────
 id (PK)
 metric_score_id ──── metric_scores.id
 document_id     ──── documents.id
 score
 sentence_detail ← JSONB   [{scores:[…], sents:[…]}, …]
```

---

## Table Reference

### CONFIG TABLES

#### `use_cases`
Top-level evaluation domains.

| column      | type | notes                        |
|-------------|------|------------------------------|
| id          | TEXT | `mental_health`, `legal_support`, `medical_diagnostics` |
| label       | TEXT | Human-readable name          |
| description | TEXT | Short purpose statement       |

**Example rows:**
```
id                  | label                                      | description
--------------------+--------------------------------------------+-----------------------------------
mental_health       | AI for Mental Health                       | Evaluation flows for mental health…
legal_support       | AI Legal Support                           | Evaluation flows for legal advice…
medical_diagnostics | Multi-modal Medical Diagnostics…           | Evaluation flows for clinical…
```

---

#### `tasks`
The NLP task type performed within a use case.

| column | type | notes                                              |
|--------|------|----------------------------------------------------|
| id     | TEXT | `summarisation`, `report_generation`, `conversational_ai`, … |
| label  | TEXT | Human-readable label                               |

---

#### `aspects`
Sociotechnical evaluation dimensions (shared globally across all paths).

| column | type | notes                                                       |
|--------|------|-------------------------------------------------------------|
| id     | TEXT | `factual_consistency`, `coherence`, `meaning_preservation`, … |
| label  | TEXT | Human-readable label                                         |

---

#### `metrics`
Concrete evaluation metrics with their infrastructure constraints.

| column                        | type    | notes                                     |
|-------------------------------|---------|-------------------------------------------|
| id                            | TEXT    | `fc_expert`, `intra_nli`, `green_score`, … |
| label                         | TEXT    |                                           |
| description                   | TEXT    |                                           |
| tags                          | TEXT[]  | `reference_based`, `nli_based`, `no_gpu`, … |
| supported_compute_environments| TEXT[]  | `cpu_only`, `gpu_available`, `cloud_inference` |
| supported_reference_modes     | TEXT[]  | `reference_free`, `reference_based`        |

**Example row:**
```
id          | fc_expert
label       | FC_expert
description | Expert-judged factual consistency metric…
tags        | {reference_based,nli_based,no_gpu}
supported_compute_environments | {cpu_only,gpu_available,cloud_inference}
supported_reference_modes      | {reference_based}
```

---

#### `paths`
An evaluation path is the combination of **use case + task + data source**.
It is the unit of configuration that the Evaluation Script Builder navigates through.

| column                 | type | notes                                                |
|------------------------|------|------------------------------------------------------|
| id                     | TEXT | `mental_health_summarisation_social_media_posts`     |
| use_case_id            | TEXT | FK → `use_cases`                                     |
| task_id                | TEXT | FK → `tasks`                                         |
| data_source_id         | TEXT | `social_media_posts`, `chest_xrays`, …               |
| data_source_label      | TEXT | Human-readable name for the data source              |
| data_source_description| TEXT | Short description                                    |

**Example rows:**
```
id                                              | use_case_id        | task_id         | data_source_label
------------------------------------------------+--------------------+-----------------+-------------------
mental_health_summarisation_social_media_posts  | mental_health      | summarisation   | Social Media Posts
legal_support_summarisation_supreme_court_…     | legal_support      | summarisation   | Supreme Court Judgements
medical_diagnostics_report_generation_chest_xrays | medical_diagnostics | report_generation | Chest X-rays
```

---

#### `path_aspects`
Which aspects apply to a path, with **path-specific** content.
Examples and stakeholder requirements are stored as JSONB because they are always
fetched as a complete unit for the Evaluation Script Builder UI — never filtered individually.

| column                  | type    | notes                                        |
|-------------------------|---------|----------------------------------------------|
| id                      | SERIAL  | Surrogate PK                                 |
| path_id                 | TEXT    | FK → `paths`                                 |
| aspect_id               | TEXT    | FK → `aspects`                               |
| definition              | TEXT    | Path-specific definition of the aspect       |
| sort_order              | INTEGER | Display order in the builder UI              |
| examples                | JSONB   | `{original_posts, good_summary, why_good, …}` |
| stakeholder_requirements| JSONB   | `{items: ["Must…", "Must not…", …]}`         |

**Example `examples` value:**
```json
{
  "original_posts": [
    "I slept 3 hours last night.",
    "I ignored messages all weekend."
  ],
  "good_summary": "The client reports poor sleep and social withdrawal.",
  "why_good": "Every claim is grounded in the source posts.",
  "bad_summary": "The client has severe depression and suicidal ideation.",
  "why_bad": "Introduces unsupported diagnoses not present in the posts."
}
```

---

#### `path_aspect_metrics`
Which metrics are applicable for a given (path, aspect) combination.

| column        | type    | notes                    |
|---------------|---------|--------------------------|
| path_aspect_id| INTEGER | FK → `path_aspects`      |
| metric_id     | TEXT    | FK → `metrics`           |

---

### RESULTS TABLES

#### `evaluation_runs`
One row per JSON result file (one run = one task evaluated across datasets and models).

| column     | type        | notes                                                  |
|------------|-------------|--------------------------------------------------------|
| id         | SERIAL      | Surrogate PK                                           |
| path_id    | TEXT        | FK → `paths` (nullable — pre-schema runs may not link) |
| title      | TEXT        | From `metadata.title` in the JSON                      |
| description| TEXT        | From `metadata.description`                            |
| created_at | TIMESTAMPTZ | Defaults to insertion time                             |

**Unique constraint:** `(path_id, title)` — prevents duplicate imports.

---

#### `datasets` / `models`
Simple name registries. Both have `(id SERIAL, name TEXT UNIQUE)`.

**Example `datasets` rows:**
```
id | name
---+----------------
 1 | CLPsych 2025
 2 | UK_Abs
 3 | Mimic
 4 | ReXGradient
```

**Example `models` rows:**
```
id | name
---+-------------------------------
 1 | Llama
 2 | Generic Base
 3 | GPT_4o
 4 | Maira-2 (with indication)
```

---

#### `run_datasets` / `run_models` / `run_metrics`
Join tables recording which datasets, models, and metrics belong to each run.

`run_metrics` also stores the **display label** (e.g. `"Factual Consistency (FC_expert)"`)
used to render leaderboard axis labels in the dashboard.

---

#### `documents`
One row per document in a dataset. The `external_id` is the document identifier from the
source data (e.g. `"83997cd4e7"` for a CLPsych post thread, `"uksc-2013-0273"` for a
Supreme Court case).

| column      | type    | notes                                              |
|-------------|---------|----------------------------------------------------|
| id          | SERIAL  | Surrogate PK                                       |
| dataset_id  | INTEGER | FK → `datasets`                                    |
| external_id | TEXT    | Original document ID from the source dataset       |
| gold_summary| TEXT    | Human-written reference summary                    |
| input       | JSONB   | Source content (text, image refs, post arrays, …)  |

---

#### `model_outputs`
The LLM-generated summary for a specific document, model, and run.

| column     | type    | notes                          |
|------------|---------|--------------------------------|
| run_id     | INTEGER | FK → `evaluation_runs`         |
| document_id| INTEGER | FK → `documents`               |
| model_id   | INTEGER | FK → `models`                  |
| llm_summary| TEXT    | Raw generated text             |

---

#### `metric_scores`
Pre-aggregated **mean** score for a (run, dataset, model, metric) combination.
Used directly to render leaderboard rankings and scatter plot means.

| column    | type             | notes                                        |
|-----------|------------------|----------------------------------------------|
| run_id    | INTEGER          | FK → `evaluation_runs`                       |
| dataset_id| INTEGER          | FK → `datasets`                              |
| model_id  | INTEGER          | FK → `models`                                |
| metric_id | TEXT             | FK → `metrics`                               |
| mean_score| DOUBLE PRECISION | Arithmetic mean across all documents in run  |

**Example rows** (mental health run, CLPsych 2025):
```
model        | metric    | mean_score
-------------+-----------+-----------
Llama        | mhic      | 0.4564
Llama        | intra_nli | 0.9625
Llama        | fc_expert | 0.9799
Generic Base | mhic      | 0.5121
Generic Base | intra_nli | 0.9812
```

---

#### `document_metric_scores`
Per-document score for each (metric_score, document) pair, plus optional sentence-level
breakdown stored as JSONB (only some metrics — e.g. `fc_expert` — produce sentence detail).

| column         | type             | notes                                           |
|----------------|------------------|-------------------------------------------------|
| metric_score_id| INTEGER          | FK → `metric_scores`                            |
| document_id    | INTEGER          | FK → `documents`                                |
| score          | DOUBLE PRECISION | Per-document metric score                       |
| sentence_detail| JSONB            | `[{scores:[0.99,0.98], sents:["…","…"]}, …]`   |

**Example `sentence_detail` value** (one document, `fc_expert`):
```json
{
  "scores": [0.9987, 0.9989],
  "sents": [
    "The interplay between adaptive and maladaptive self-states…",
    "The maladaptive self-states seem to be more dominant…"
  ]
}
```

---

## Design Notes

**Why JSONB for `examples` and `stakeholder_requirements`?**
The Evaluation Script Builder always fetches this content as a complete unit per aspect.
It is never filtered, aggregated, or joined against — normalising it into child rows
would add join overhead without enabling any useful query.

**Why JSONB for `sentence_detail`?**
Sentence-level scores are only ever rendered for a single document at a time (the popover
in the dashboard). There is no cross-document sentence query. JSONB avoids a wide
fan-out table with no query benefit.

**Why is `mean_score` stored rather than computed?**
The leaderboard queries `mean_score` on every dashboard load. Pre-computing it in
`metric_scores` avoids a full `AVG` over `document_metric_scores` on each request.

**Why does `evaluation_runs.path_id` allow NULL?**
Future uploads via the UI may arrive before the corresponding path has been defined
in the config, or researchers may upload one-off runs that do not fit any existing path.
