/** @format */

import PropTypes from "prop-types";
import { useState } from "react";
import { createMetric } from "../../../api/config";
import { useAdmin } from "../../../hooks/useAdmin";
import AdminCreateHeader from "../../navigation_and_controls/AdminCreateHeader";
import { toSlug } from "../../../utils/slug";

const COMPUTE_OPTIONS = ["cpu_only", "gpu_available", "cloud_inference"];
const REFERENCE_OPTIONS = ["reference_free", "reference_based"];

const EMPTY_FORM = {
  label: "",
  description: "",
  tags: "",
  supported_compute_environments: [],
  supported_reference_modes: [],
};

const CreateMetricForm = ({ onCreated, onCancel }) => {
  const { token } = useAdmin();
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const derivedId = toSlug(form.label);

  const toggleArrayValue = (field, value) =>
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const payload = {
        id: derivedId,
        label: form.label.trim(),
        description: form.description.trim() || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        supported_compute_environments: form.supported_compute_environments,
        supported_reference_modes: form.supported_reference_modes,
      };
      const created = await createMetric(payload, token);
      onCreated(created);
    } catch (err) {
      setError(err.message ?? "Create failed. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <AdminCreateHeader
        title="New Metric"
        onCancel={onCancel}
        onCreate={handleCreate}
        creating={creating}
        canCreate={!!form.label.trim() && !!derivedId}
      />

      <label className="admin-label">
        ID{" "}
        <span style={{ color: "#666", fontStyle: "italic", fontSize: "0.68rem", textTransform: "none" }}>
          (auto-generated)
        </span>
      </label>
      <input
        value={derivedId || "—"}
        disabled
        className={`admin-input ${derivedId ? "mb-3" : "mb-1"}`}
        style={{ color: derivedId ? "#666" : "#e07070" }}
      />
      {!derivedId && form.label.trim() && (
        <p className="text-error mb-3" style={{ fontSize: "0.72rem" }}>
          Label must contain at least one letter or number.
        </p>
      )}

      <label className="admin-label">Label *</label>
      <input
        value={form.label}
        onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
        placeholder="e.g. Conciseness"
        className="admin-input mb-3"
        autoFocus
      />

      <label className="admin-label">Description</label>
      <textarea
        value={form.description}
        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        rows={3}
        placeholder="Describe this metric…"
        className="admin-input mb-3"
        style={{ resize: "vertical" }}
      />

      <label className="admin-label">
        Tags <span style={{ color: "#666", fontWeight: 400 }}>(comma-separated)</span>
      </label>
      <input
        value={form.tags}
        onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
        placeholder="e.g. lexical, overlap"
        className="admin-input mb-3"
      />

      <label className="admin-label">Supported Compute Environments</label>
      <div className="admin-checkbox-group">
        {COMPUTE_OPTIONS.map((opt) => (
          <label key={opt} className="admin-checkbox-label">
            <input
              type="checkbox"
              checked={form.supported_compute_environments.includes(opt)}
              onChange={() => toggleArrayValue("supported_compute_environments", opt)}
            />
            {opt}
          </label>
        ))}
      </div>

      <label className="admin-label">Supported Reference Modes</label>
      <div className="admin-checkbox-group">
        {REFERENCE_OPTIONS.map((opt) => (
          <label key={opt} className="admin-checkbox-label">
            <input
              type="checkbox"
              checked={form.supported_reference_modes.includes(opt)}
              onChange={() => toggleArrayValue("supported_reference_modes", opt)}
            />
            {opt}
          </label>
        ))}
      </div>

      {error && <p className="text-error">{error}</p>}
    </>
  );
};

CreateMetricForm.propTypes = {
  onCreated: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default CreateMetricForm;
