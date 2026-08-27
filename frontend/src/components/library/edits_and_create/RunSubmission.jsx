/** @format */

import { useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { ingestRun } from "../../../api/config";
import { useAdmin } from "../../../hooks/useAdmin";

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

const RunSubmission = ({ pathId, useCaseId, title, notes, disabled, onCancel }) => {
  const { token } = useAdmin();
  const navigate = useNavigate();

  const [mode, setMode] = useState("attach");
  const [datasetName, setDatasetName] = useState("");
  const [modelName, setModelName] = useState("");
  const [sensitive, setSensitive] = useState(false);
  const [resultsFile, setResultsFile] = useState(null);
  const [summariesFile, setSummariesFile] = useState(null);
  const [sourceFile, setSourceFile] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    !disabled &&
    !submitting &&
    !!datasetName.trim() &&
    !!modelName.trim() &&
    !!resultsFile;

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      // Each file goes into the body under its own key, unchanged.
      const [results, llmSummaries, inputs] = await Promise.all([
        readJsonFile(resultsFile),
        readOptionalJsonFile(summariesFile),
        readOptionalJsonFile(sourceFile),
      ]);
      const { run_id: runId } = await ingestRun(
        {
          path_id: pathId,
          title,
          notes: notes || null,
          dataset: { name: datasetName.trim(), sensitive },
          model: { name: modelName.trim() },
          inputs,
          llm_summaries: llmSummaries,
          results,
        },
        token,
      );
      navigate(`/runs/${useCaseId}/${pathId}/${runId}`);
    } catch (err) {
      // ApiError.message already carries the server's validation text.
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="block">
      <div className="run-mode-choice">
        <button
          type="button"
          className="run-mode-button"
          disabled
          title="Requires the metric calculation service"
        >
          Calculate now (not yet available)
        </button>
        <button
          type="button"
          className={`run-mode-button ${mode === "attach" ? "is-active" : ""}`}
          onClick={() => setMode("attach")}
        >
          Attach results JSON
        </button>
      </div>

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

        <div className="field">
          <label className="label is-small" htmlFor="summaries-file">
            Model summaries (optional)
          </label>
          <input
            id="summaries-file"
            className="input"
            type="file"
            accept="application/json,.json"
            onChange={(e) => setSummariesFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="field">
          <label className="label is-small" htmlFor="source-file">
            Source data (optional)
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
          {submitting ? "Uploading…" : "Create run"}
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
  disabled: PropTypes.bool,
  onCancel: PropTypes.func.isRequired,
};

RunSubmission.defaultProps = {
  notes: "",
  disabled: false,
};

export default RunSubmission;
