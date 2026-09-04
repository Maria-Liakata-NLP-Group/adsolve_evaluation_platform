/** @format */

import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { ingestRun } from "../../../api/config";
import { getCalculableMetrics, submitEvaluation } from "../../../api/evaluations";
import { useAdmin } from "../../../hooks/useAdmin";
import EvaluationJobStatus from "./EvaluationJobStatus";

// Reads a File as parsed JSON, rejecting with a readable message on failure.
const readJsonFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch {
        reject(new Error(`${file.name} is not valid JSON.`));
      }
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsText(file);
  });

// The source-data and summaries files are optional; an empty map means "not supplied".
const readOptionalJsonFile = async (file) => (file ? readJsonFile(file) : {});

// Which reference data the chosen metrics need: a subset of {"gold", "posts"}.
const requiredReferences = (metrics) =>
  new Set(metrics.map((metric) => metric.requires).filter(Boolean));

const RunSubmission = ({
  pathId,
  useCaseId,
  title,
  notes,
  selectedMetricIds,
  disabled,
  onCancel,
}) => {
  const { token } = useAdmin();
  const navigate = useNavigate();

  const [mode, setMode] = useState("attach");
  const [datasetName, setDatasetName] = useState("");
  const [modelName, setModelName] = useState("");
  const [sensitive, setSensitive] = useState(false);
  const [resultsFile, setResultsFile] = useState(null);
  const [summariesFile, setSummariesFile] = useState(null);
  const [goldFile, setGoldFile] = useState(null);
  const [sourceFile, setSourceFile] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState(null);

  // Everything the metric service can compute and this platform can store.
  const [calculableMetrics, setCalculableMetrics] = useState([]);
  const [calculateUnavailable, setCalculateUnavailable] = useState(
    "Checking the metric calculation service…",
  );

  // Tracked in a ref so picking a mode does not re-trigger the lookup below.
  const modeChosen = useRef(false);
  const chooseMode = (next) => {
    modeChosen.current = true;
    setMode(next);
  };

  useEffect(() => {
    if (!token) {
      setCalculateUnavailable("Sign in as an admin to calculate metrics.");
      return;
    }
    getCalculableMetrics(token)
      .then((metrics) => {
        setCalculableMetrics(metrics);
        setCalculateUnavailable(null);
        // Calculating is the primary path once the service is reachable;
        // attaching a results file is the fallback, not the default.
        if (!modeChosen.current) setMode("calculate");
      })
      // A 503 here means the service is not configured for this deployment.
      .catch((err) => setCalculateUnavailable(err.message));
  }, [token]);

  // The selected aspects' metrics, narrowed to those actually computable now.
  const runnableMetrics = useMemo(
    () =>
      calculableMetrics.filter(
        (metric) => selectedMetricIds.includes(metric.id) && metric.available,
      ),
    [calculableMetrics, selectedMetricIds],
  );

  const references = useMemo(
    () => requiredReferences(runnableMetrics),
    [runnableMetrics],
  );
  const needsGold = references.has("gold");
  const needsPosts = references.has("posts");

  const isCalculate = mode === "calculate";
  const canSubmit =
    !disabled &&
    !submitting &&
    !!datasetName.trim() &&
    !!modelName.trim() &&
    (isCalculate
      ? runnableMetrics.length > 0 &&
        !!summariesFile &&
        (!needsGold || !!goldFile) &&
        (!needsPosts || !!sourceFile)
      : !!resultsFile);

  const identity = {
    path_id: pathId,
    title,
    notes: notes || null,
    dataset: { name: datasetName.trim(), sensitive },
    model: { name: modelName.trim() },
  };

  const handleAttach = async () => {
    // Each file goes into the body under its own key, unchanged.
    const [results, llmSummaries, inputs] = await Promise.all([
      readJsonFile(resultsFile),
      readOptionalJsonFile(summariesFile),
      readOptionalJsonFile(sourceFile),
    ]);
    const { run_id: runId } = await ingestRun(
      { ...identity, inputs, llm_summaries: llmSummaries, results },
      token,
    );
    navigate(`/runs/${useCaseId}/${pathId}/${runId}`);
  };

  const handleCalculate = async () => {
    // Content is forwarded to the metric service, never stored by the platform.
    const [llmSummaries, goldSummaries, inputs] = await Promise.all([
      readJsonFile(summariesFile),
      readOptionalJsonFile(goldFile),
      readOptionalJsonFile(sourceFile),
    ]);
    const { job_id: newJobId } = await submitEvaluation(
      {
        ...identity,
        metrics: runnableMetrics.map((metric) => metric.id),
        llm_summaries: llmSummaries,
        gold_summaries: goldSummaries,
        inputs,
      },
      token,
    );
    setJobId(newJobId);
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await (isCalculate ? handleCalculate() : handleAttach());
    } catch (err) {
      // ApiError.message already carries the server's validation text.
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Once dispatched, the form is replaced by the job's progress.
  if (jobId) {
    return (
      <EvaluationJobStatus
        jobId={jobId}
        useCaseId={useCaseId}
        pathId={pathId}
        onDone={onCancel}
      />
    );
  }

  return (
    <section className="block">
      <div className="run-mode-choice">
        <button
          type="button"
          className={`run-mode-button ${isCalculate ? "is-active" : ""}`}
          disabled={!!calculateUnavailable}
          title={calculateUnavailable ?? "Compute metrics now"}
          onClick={() => chooseMode("calculate")}
        >
          Calculate now
        </button>
        <button
          type="button"
          className={`run-mode-button ${mode === "attach" ? "is-active" : ""}`}
          onClick={() => chooseMode("attach")}
        >
          Attach results JSON
        </button>
      </div>

      {/* Say why calculating is unavailable rather than just grey out the button. */}
      {calculateUnavailable && (
        <p className="content is-small run-mode-note">
          Calculating is unavailable: {calculateUnavailable}
        </p>
      )}

      {isCalculate && (
        <div className="run-metric-summary">
          {runnableMetrics.length > 0 ? (
            <>
              <p className="content is-small mb-2">
                {runnableMetrics.length} metric
                {runnableMetrics.length === 1 ? "" : "s"} will be computed:
              </p>
              <div className="tags">
                {runnableMetrics.map((metric) => (
                  <span key={metric.id} className="tag">
                    {metric.label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <article className="message is-warning">
              <div className="message-body">
                Select at least one aspect whose metrics the calculation service
                can compute.
              </div>
            </article>
          )}
        </div>
      )}

      <div className="run-attach-fields">
        <div className="field">
          <label className="label is-small" htmlFor="dataset-name">
            Dataset name
          </label>
          <input
            id="dataset-name"
            className="input"
            type="text"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="label is-small" htmlFor="model-name">
            Model name
          </label>
          <input
            id="model-name"
            className="input"
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
          />
        </div>

        {!isCalculate && (
          <div className="field">
            <label className="label is-small" htmlFor="results-file">
              Results JSON (required)
            </label>
            <input
              id="results-file"
              className="input"
              type="file"
              accept="application/json,.json"
              onChange={(e) => setResultsFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        <div className="field">
          <label className="label is-small" htmlFor="summaries-file">
            Model summaries {isCalculate ? "(required)" : "(optional)"}
          </label>
          <input
            id="summaries-file"
            className="input"
            type="file"
            accept="application/json,.json"
            onChange={(e) => setSummariesFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {isCalculate && (
          <div className="field">
            <label className="label is-small" htmlFor="gold-file">
              Reference summaries {needsGold ? "(required)" : "(optional)"}
            </label>
            <input
              id="gold-file"
              className="input"
              type="file"
              accept="application/json,.json"
              onChange={(e) => setGoldFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        <div className="field">
          <label className="label is-small" htmlFor="source-file">
            Source data {isCalculate && needsPosts ? "(required)" : "(optional)"}
          </label>
          <input
            id="source-file"
            className="input"
            type="file"
            accept="application/json,.json"
            onChange={(e) => setSourceFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <label className="checkbox is-flex is-align-items-center mb-4">
        <input
          type="checkbox"
          className="mr-2"
          checked={sensitive}
          onChange={() => setSensitive((previous) => !previous)}
        />
        Sensitive dataset — store numeric scores only, never raw text
      </label>

      {error && <p className="text-error mb-3">{error}</p>}

      <div className="is-flex is-align-items-center gap-3">
        <button
          type="button"
          className="button is-primary is-large"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitting
            ? isCalculate
              ? "Submitting…"
              : "Uploading…"
            : isCalculate
              ? "Calculate metrics"
              : "Create run"}
        </button>
        <button type="button" className="button is-large" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
};

RunSubmission.propTypes = {
  pathId: PropTypes.string.isRequired,
  useCaseId: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  notes: PropTypes.string,
  selectedMetricIds: PropTypes.arrayOf(PropTypes.string),
  disabled: PropTypes.bool,
  onCancel: PropTypes.func.isRequired,
};

RunSubmission.defaultProps = {
  notes: "",
  selectedMetricIds: [],
  disabled: false,
};

export default RunSubmission;
