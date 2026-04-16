# Evaluation Builder Structure and Guide for Adding New Use Cases

## Overview

The evaluation builder is a configuration-driven frontend module that helps users move from a **real-world evaluation setup** to a **set of relevant aspects and feasible metrics**.

The flow is:

**Use case → Task → Data source → Infrastructure constraints → Aspects → Metrics**

Conceptually:

- **Use cases** define the broad application domain, such as mental health, legal support, or medical diagnostics.
- **Tasks** define what the model is doing, such as summarisation or report generation.
- **Data sources** define the concrete input type, such as social media posts, Supreme Court judgements, or chest X-rays.
- **Infrastructure constraints** define feasibility constraints, such as CPU-only vs GPU-available and reference-free vs reference-based evaluation.
- **Aspects** are the primary reusable ontology. They are the socio-technical evaluation concepts that users select, such as factual consistency, coherence, privacy, clinical significance, or conciseness.
- **Metrics** are the technical evaluation implementations used to operationalise those aspects.

The builder uses a combination of:

1. **Global YAML files** for shared definitions across the whole app.
2. **Path-specific YAML files** for concrete use-case/task/data-source combinations.
3. **A registry in `index.js`** that imports all YAML files, parses them, and exposes helper functions for the UI.

---

## Folder Structure

```text
script_builder/
├── index.js
├── globals/
│   ├── aspects.yaml
│   ├── infrastructure.yaml
│   ├── metrics.yaml
│   ├── tasks.yaml
│   └── use_cases.yaml
└── paths/
    ├── index.yaml
    ├── legal_support/
    │   └── legal_support_press_summaries_use_case.yaml
    ├── mental_health/
    │   ├── summarisation_dialogue_plus_conversations.yaml
    │   └── summarisation_social_media_posts.yaml
    └── multimodal_diagnostics/
        └── multimodal_diagnostics_chest_xray_report_generation.yaml
```

---

## What Each File Does

### `globals/use_cases.yaml`
Defines the top-level use cases shown in the UI.

Example structure:

```yaml
use_cases:
  mental_health:
    label: AI for Mental Health
    description: Evaluation flows for mental health support scenarios.
```

This file controls:
- which use cases appear in the builder
- their user-facing labels
- their general descriptions

---

### `globals/tasks.yaml`
Defines the available tasks across the app.

Example:

```yaml
tasks:
  summarisation:
    label: Summarisation
  report_generation:
    label: Report Generation
```

This file controls the task options shown to the user.

---

### `globals/infrastructure.yaml`
Defines infrastructure constraints and their user-facing labels.

Example:

```yaml
infrastructure:
  compute_environment:
    label: Compute environment
    options:
      - cpu_only
      - gpu_available
      - cloud_inference
```

This file controls:
- which infrastructure dimensions are available
- which options are shown in the UI
- how those options are labeled

These values are later matched against each metric’s `supported_infrastructure`.

---

### `globals/aspects.yaml`
Defines the reusable aspect vocabulary used across use cases.

Example:

```yaml
aspects:
  factual_consistency:
    label: Factual Consistency
  coherence:
    label: Coherence
```

This file is the shared ontology layer of the builder.

A path file can only use aspect IDs that are defined here.

---

### `globals/metrics.yaml`
Defines all metrics globally, including:
- display label
- description
- tags
- supported infrastructure

Example:

```yaml
metrics:
  intra_nli:
    label: IntraNLI
    description: Coherence-oriented metric that checks whether the generated output is internally consistent and logically connected.
    supported_infrastructure:
      compute_environment:
        - cpu_only
        - gpu_available
        - cloud_inference
      reference_mode:
        - reference_free
        - reference_based
```

This file is the core technical catalogue of the builder.

A path file can only reference metric IDs that are defined here.

---

### `paths/index.yaml`
This file is the master index of all concrete builder paths.

Each entry links together:
- a unique path ID
- a use case
- a task
- a data source
- a file path

Example:

```yaml
- id: mental_health_summarisation_social_media_posts
  use_case: mental_health
  task: summarisation
  data_source: social_media_posts
  data_source_label: Social Media Posts
  file: mental_health/summarisation_social_media_posts.yaml
```

This file is used to:
- determine which data sources are available for a selected use case and task
- build path IDs
- look up the correct path configuration

---

### `paths/<domain>/<file>.yaml`
These files define the actual use-case-specific content shown in the builder.

Each path YAML contains:
- `id`
- `use_case`
- `task`
- `data_source`
- `aspects`

Each aspect then includes:
- `definition`
- `examples`
- `stakeholder_requirements`
- `metrics`

Example pattern:

```yaml
id: mental_health_summarisation_social_media_posts
use_case: mental_health
task: summarisation
data_source:
  id: social_media_posts
  label: Social Media Posts
  description: Short-form user-generated text posts used as input for summarisation.

aspects:
  factual_consistency:
    definition: ...
    examples:
      title: Examples
      original_posts:
        - ...
      good_summary: ...
      why_good: ...
      bad_summary: ...
      why_bad: ...
    stakeholder_requirements:
      title: Mapped Requirements
      items:
        - ...
    metrics:
      - fc_document
      - fc_expert
```

These files are where stakeholder requirements are translated into:
- aspects
- definitions
- examples
- metrics

This is the most important content layer in the builder.

---

### `index.js`
This file is the glue code that imports all YAML files and exposes them to the rest of the app.

It does five key things:

#### 1. Imports all global YAML files
```js
import useCasesRaw from "./globals/use_cases.yaml?raw";
import tasksRaw from "./globals/tasks.yaml?raw";
...
```

#### 2. Imports the path index
```js
import pathIndexRaw from "./paths/index.yaml?raw";
```

#### 3. Imports every concrete path YAML file manually
```js
import mentalHealthSummarisationSocialMediaPostsRaw from "./paths/mental_health/summarisation_social_media_posts.yaml?raw";
```

#### 4. Parses all YAML into JavaScript objects
```js
const parse = (raw) => yaml.load(raw) || {};
```

#### 5. Builds helper registries and lookup functions
Key exports:
- `USE_CASES`
- `TASKS`
- `INFRASTRUCTURE`
- `ASPECTS`
- `METRICS`
- `PATH_INDEX`
- `PATHS_BY_ID`

Helper functions:
- `buildPathId(useCaseId, taskId, dataSourceId)`
- `getPathConfig(useCaseId, taskId, dataSourceId)`
- `getAvailableTasksForUseCase(useCaseId)`
- `getAvailableDataSources(useCaseId, taskId)`

---

## How the Builder Resolves a User Selection

When a user interacts with the builder, the data flow is roughly:

1. The UI loads global definitions from:
   - `USE_CASES`
   - `TASKS`
   - `INFRASTRUCTURE`
   - `ASPECTS`
   - `METRICS`

2. The selected use case is used to determine available tasks via:
   - `getAvailableTasksForUseCase(useCaseId)`

3. The selected use case and task are used to determine available data sources via:
   - `getAvailableDataSources(useCaseId, taskId)`

4. Once use case, task, and data source are selected, the app builds a path ID:
   - `buildPathId(useCaseId, taskId, dataSourceId)`

5. That ID is used to fetch the matching path file from:
   - `PATHS_BY_ID`

6. The selected path file determines:
   - which aspects are shown
   - their definitions
   - examples
   - mapped stakeholder requirements
   - candidate metrics

7. The candidate metrics can then be filtered against the chosen infrastructure constraints using each metric’s `supported_infrastructure`.

---

## Recommended Mental Model

A useful way to think about the builder is:

- **Globals define the vocabulary**
- **Paths define the scenarios**
- **`index.js` defines the registry**

More specifically:

- `globals/aspects.yaml` tells the app **which aspects exist**
- `globals/metrics.yaml` tells the app **which metrics exist and when they are feasible**
- `paths/*.yaml` tell the app **how aspects and metrics apply in a specific real-world configuration**

---

## How to Add a New Use Case or Path

There are two slightly different cases:

### Case 1: Add a brand-new top-level use case
Example: adding a new domain such as `education_support`

### Case 2: Add a new path under an existing use case
Example: adding another `mental_health + summarisation + new_data_source` configuration

The steps below cover both.

---

## Step-by-Step: Adding a New Path

### Step 1: Check whether the use case already exists
Open:

```text
globals/use_cases.yaml
```

If the use case already exists, reuse its ID.

If not, add a new entry:

```yaml
use_cases:
  education_support:
    label: AI for Education Support
    description: Evaluation flows for educational support scenarios.
```

---

### Step 2: Check whether the task already exists
Open:

```text
globals/tasks.yaml
```

If needed, add a new task:

```yaml
tasks:
  feedback_generation:
    label: Feedback Generation
```

Only do this if the task is genuinely new.

---

### Step 3: Check whether the aspects already exist
Open:

```text
globals/aspects.yaml
```

If your new path uses new aspect IDs, add them here first.

Example:

```yaml
aspects:
  pedagogical_alignment:
    label: Pedagogical Alignment
```

If the aspect already exists, reuse it. The path-specific YAML is where you tailor the definition and examples to the new context.

---

### Step 4: Check whether the required metrics already exist
Open:

```text
globals/metrics.yaml
```

If your path needs a new metric:
- add its ID
- add a display label
- add a description
- define its `supported_infrastructure`

Example:

```yaml
pedagogical_faithfulness:
  label: Pedagogical Faithfulness
  description: Evaluates whether generated feedback remains aligned with the source rubric.
  supported_infrastructure:
    compute_environment:
      - cpu_only
      - gpu_available
    reference_mode:
      - reference_based
```

If the metric already exists, reuse it in the path file.

---

### Step 5: Create the new path YAML file
Create a file under the relevant folder inside `paths/`.

Examples:
- `paths/mental_health/...`
- `paths/legal_support/...`
- `paths/multimodal_diagnostics/...`

Suggested naming pattern:
```text
<task>_<data_source>.yaml
```
or
```text
<use_case>_<specific_scenario>.yaml
```

The file should follow this structure:

```yaml
# @format

id: usecase_task_datasource
use_case: usecase
task: task_id
data_source:
  id: datasource_id
  label: Human-readable label
  description: Brief description of the input data.

aspects:
  aspect_id:
    definition: ...
    examples:
      title: Examples
      original_posts:
        - ...
      good_summary: ...
      why_good: ...
      bad_summary: ...
      why_bad: ...
    stakeholder_requirements:
      title: Mapped Requirements
      items:
        - ...
    metrics:
      - metric_id
```

Important:
- the `id` should match the builder convention:
  **`${use_case}_${task}_${data_source.id}`**
- every aspect key must already exist in `globals/aspects.yaml`
- every metric ID must already exist in `globals/metrics.yaml`

---

### Step 6: Add the path to `paths/index.yaml`
Register the new path:

```yaml
- id: usecase_task_datasource
  use_case: usecase
  task: task_id
  data_source: datasource_id
  data_source_label: Human-readable label
  file: folder/filename.yaml
```

This is what makes the new data source discoverable in the builder.

---

### Step 7: Import the file in `index.js`
Add a raw import:

```js
import newPathRaw from "./paths/folder/filename.yaml?raw";
```

Then register it inside `rawPaths`:

```js
const rawPaths = {
  ...
  usecase_task_datasource: newPathRaw,
};
```

This step is essential. The path will not load unless it is imported and added to the registry.

---

### Step 8: Verify ID consistency
The same path ID should line up across three places:

1. In the path YAML file:
```yaml
id: usecase_task_datasource
```

2. In `paths/index.yaml`:
```yaml
- id: usecase_task_datasource
```

3. In `index.js` under `rawPaths`:
```js
usecase_task_datasource: newPathRaw
```

If these do not match, `getPathConfig()` will return `null`.

---

## Suggested Authoring Workflow for a New Path

A practical workflow is:

1. Define the real-world scenario.
2. Extract stakeholder goals and requirements.
3. Choose the task and data source.
4. Map the requirements to reusable aspects.
5. Select candidate metrics for each aspect.
6. Check metric feasibility against infrastructure constraints.
7. Create the path YAML.
8. Register it in `paths/index.yaml`.
9. Import and register it in `index.js`.
10. Test that the UI surfaces the new path correctly.

---

## What Goes Into a Good Path YAML

A good path YAML should do more than list metrics. It should make the evaluation logic interpretable.

Each aspect should ideally include:

### 1. A clear definition
This should explain what the aspect means in the context of the selected use case.

### 2. Concrete examples
Use realistic examples that show:
- source input
- good output
- why it is good
- bad output
- why it is bad

### 3. Mapped stakeholder requirements
These should be phrased in plain language and tied to the scenario.

### 4. Candidate metrics
These should be the metric IDs from `globals/metrics.yaml`.

This is what allows the builder to connect:
**stakeholder language → aspects → metrics**

---

## Example: Adding a New Medical Diagnostics Path

Suppose you want to add a new path for:

- Use case: `medical_diagnostics`
- Task: `report_generation`
- Data source: `mri_scans`

### 1. Add the path YAML
File:
```text
paths/multimodal_diagnostics/report_generation_mri_scans.yaml
```

### 2. Give it an ID
```yaml
id: medical_diagnostics_report_generation_mri_scans
```

### 3. Register it in `paths/index.yaml`
```yaml
- id: medical_diagnostics_report_generation_mri_scans
  use_case: medical_diagnostics
  task: report_generation
  data_source: mri_scans
  data_source_label: MRI Scans
  file: multimodal_diagnostics/report_generation_mri_scans.yaml
```

### 4. Import and register it in `index.js`
```js
import medicalDiagnosticsReportGenerationMriScansRaw from "./paths/multimodal_diagnostics/report_generation_mri_scans.yaml?raw";

const rawPaths = {
  ...
  medical_diagnostics_report_generation_mri_scans:
    medicalDiagnosticsReportGenerationMriScansRaw,
};
```

That is enough for the builder to surface the new data source under:
**Multi-modal Medical Diagnostics and Monitoring → Report Generation**

---

## Common Pitfalls

### 1. ID mismatches
The builder relies heavily on consistent IDs.

Make sure these match exactly:
- path file `id`
- `paths/index.yaml` entry `id`
- `rawPaths` key in `index.js`

---

### 2. Use case naming drift
Be careful to keep the same use case ID everywhere.

In the current files, the medical diagnostics path is stored inside the folder `multimodal_diagnostics`, but the global use case ID is `medical_diagnostics`. That is fine as long as the actual IDs remain consistent, but it can be confusing when authoring new files.

Use the values in:
- `globals/use_cases.yaml`
- `paths/index.yaml`

as the source of truth.

---

### 3. Missing aspect definitions
If a path uses an aspect that is not present in `globals/aspects.yaml`, the app will not have a global label for it.

Always add new aspect IDs globally before using them in a path file.

---

### 4. Missing metric definitions
If a path references a metric ID that is not in `globals/metrics.yaml`, the app cannot resolve it properly.

Always define new metrics globally first.

---

### 5. Forgetting to import the new path in `index.js`
Even if the YAML exists and is listed in `paths/index.yaml`, it still will not load unless it is also imported and added to `rawPaths`.

---

### 6. Infrastructure incompatibility
A metric may exist globally but still be unavailable under the selected infrastructure constraints.

Check `supported_infrastructure` carefully when adding new metrics.

---

## Recommended Improvements for Future Maintenance

The current structure works well, but a few changes would make it easier to maintain.

### 1. Auto-load path files
Right now every new path requires a manual import in `index.js`.

A future improvement would be to auto-discover YAML files instead of manually importing each one.

---

### 2. Validate path IDs automatically
A small validation script could check:
- every `paths/index.yaml` entry has a corresponding file
- every path file has a matching `id`
- every `rawPaths` key matches a known path ID
- every aspect exists globally
- every metric exists globally

This would prevent a lot of silent breakage.

---

### 3. Standardise naming conventions
At the moment there is some variation between:
- folder names
- path IDs
- file names
- use case IDs

A short naming convention document would help keep future additions consistent.

Suggested pattern:
- use case IDs: snake_case, shared across all files
- path IDs: `use_case_task_data_source`
- file names: descriptive but stable
- folder names: match use case IDs where possible

---

## Minimal Checklist for Adding a New Path

Before considering a new path complete, check:

- [ ] Use case exists in `globals/use_cases.yaml`
- [ ] Task exists in `globals/tasks.yaml`
- [ ] All aspect IDs exist in `globals/aspects.yaml`
- [ ] All metric IDs exist in `globals/metrics.yaml`
- [ ] New path YAML file created in `paths/...`
- [ ] Path added to `paths/index.yaml`
- [ ] File imported in `index.js`
- [ ] Path added to `rawPaths`
- [ ] Path ID matches across all files
- [ ] UI shows the new data source and aspects correctly

---

## In Summary

The evaluation builder is built around a simple but powerful separation of concerns:

- **Global YAML files** define the shared vocabulary of use cases, tasks, infrastructure, aspects, and metrics.
- **Path YAML files** define how a specific real-world configuration maps stakeholder requirements to aspects and metrics.
- **`index.js`** ties everything together by parsing the YAML files and exposing helper functions for the UI.

To add a new use case or scenario, you update the shared definitions where needed, add a new path YAML, register it in `paths/index.yaml`, and import it in `index.js`.

That design keeps the builder interpretable, modular, and easy to extend as new evaluation scenarios are added.
