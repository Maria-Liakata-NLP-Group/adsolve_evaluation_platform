/** @format */

import PropTypes from "prop-types";
import { useState } from "react";
import { updateMetric } from "../api/config";
import { useAdmin } from "../hooks/useAdmin";
import AdminEditHeader from "./AdminEditHeader";

const COMPUTE_OPTIONS = ["cpu_only", "gpu_available", "cloud_inference"];
const REFERENCE_OPTIONS = ["reference_free", "reference_based"];

const MetricDetailEdit = ({ metric, onSaved, onCancel }) => {
  const { token } = useAdmin();
  const [form, setForm] = useState({
    label: metric.label,
    description: metric.description ?? "",
    tags: (metric.tags ?? []).join(", "),
    supported_compute_environments: metric.supported_compute_environments ?? [],
    supported_reference_modes: metric.supported_reference_modes ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const toggleArrayValue = (field, value) =>
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateMetric(metric.id, {
        id: metric.id,
        label: form.label.trim(),
        description: form.description.trim() || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        supported_compute_environments: form.supported_compute_environments,
        supported_reference_modes: form.supported_reference_modes,
      }, token);
      onSaved(updated);
    } catch (err) {
      setSaveError(err.message ?? "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminEditHeader
        title="Editing metric"
        onCancel={onCancel}
        onSave={handleSave}
        saving={saving}
        canSave={!!form.label.trim()}
      />

      <label className="admin-label">Label *</label>
      <input
        value={form.label}
        onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
        className="admin-input"
      />

      <label className="admin-label">Description</label>
      <textarea
        value={form.description}
        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        rows={4}
        className="admin-input"
        style={{ resize: "vertical" }}
      />

      <label className="admin-label">
        Tags{" "}
        <span style={{ color: "#666", fontWeight: 400 }}>(comma-separated)</span>
      </label>
      <input
        value={form.tags}
        onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
        placeholder="e.g. lexical, overlap"
        className="admin-input"
      />

      <label className="admin-label">Supported Compute Environments</label>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {COMPUTE_OPTIONS.map((opt) => (
          <label
            key={opt}
            style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", color: "#ccc", cursor: "pointer" }}
          >
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
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {REFERENCE_OPTIONS.map((opt) => (
          <label
            key={opt}
            style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", color: "#ccc", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={form.supported_reference_modes.includes(opt)}
              onChange={() => toggleArrayValue("supported_reference_modes", opt)}
            />
            {opt}
          </label>
        ))}
      </div>

      {saveError && <p style={{ color: "#e07070", fontSize: "0.8rem" }}>{saveError}</p>}
    </>
  );
};

MetricDetailEdit.propTypes = {
  metric: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    supported_compute_environments: PropTypes.arrayOf(PropTypes.string),
    supported_reference_modes: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onSaved: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default MetricDetailEdit;
