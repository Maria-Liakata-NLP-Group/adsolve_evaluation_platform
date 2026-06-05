/** @format */

import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { createAspect, getMetrics } from "../../../api/config";
import { useAdmin } from "../../../hooks/useAdmin";
import AdminCreateHeader from "../../navigation_and_controls/AdminCreateHeader";
import { toSlug } from "../../../utils/slug";

const EMPTY_FORM = { label: "", description: "", metric_ids: [] };

const CreateAspectForm = ({ onCreated, onCancel }) => {
  const { token } = useAdmin();
  const [form, setForm] = useState(EMPTY_FORM);
  const [allMetrics, setAllMetrics] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const derivedId = toSlug(form.label);

  useEffect(() => {
    getMetrics()
      .then(setAllMetrics)
      .catch(() => setAllMetrics([]));
  }, []);

  const removeMetric = (id) =>
    setForm((p) => ({ ...p, metric_ids: p.metric_ids.filter((m) => m !== id) }));

  const addMetric = (id) =>
    setForm((p) => ({ ...p, metric_ids: [...p.metric_ids, id] }));

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const payload = {
        id: derivedId,
        label: form.label.trim(),
        description: form.description.trim() || null,
        metric_ids: form.metric_ids,
      };
      const created = await createAspect(payload, token);
      onCreated(created);
    } catch (err) {
      setError(err.message ?? "Create failed. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const availableMetrics = allMetrics.filter((m) => !form.metric_ids.includes(m.id));
  const selectedMetrics = allMetrics.filter((m) => form.metric_ids.includes(m.id));

  return (
    <>
      <AdminCreateHeader
        title="New Aspect"
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
        className="admin-input"
        style={{ color: derivedId ? "#666" : "#e07070", marginBottom: "0.75rem" }}
      />

      <label className="admin-label">Label *</label>
      <input
        value={form.label}
        onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
        placeholder="e.g. Coherence"
        className="admin-input"
        style={{ marginBottom: "0.75rem" }}
        autoFocus
      />

      <label className="admin-label">Description</label>
      <textarea
        value={form.description}
        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        rows={3}
        placeholder="Describe this aspect…"
        className="admin-input"
        style={{ resize: "vertical", marginBottom: "0.75rem" }}
      />

      <label className="admin-label">Metrics</label>
      {selectedMetrics.length > 0 && (
        <div style={{ marginBottom: "0.5rem" }}>
          {selectedMetrics.map((m) => (
            <div key={m.id} className="admin-metric-row">
              <span className="admin-metric-label">{m.label}</span>
              <button
                type="button"
                onClick={() => removeMetric(m.id)}
                className="admin-metric-remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {availableMetrics.length > 0 && (
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) addMetric(e.target.value);
            e.target.value = "";
          }}
          className="admin-input"
          style={{ marginBottom: "0.75rem" }}
        >
          <option value="" disabled>Select a metric to add…</option>
          {availableMetrics.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      )}

      {error && <p style={{ color: "#e07070", fontSize: "0.8rem" }}>{error}</p>}
    </>
  );
};

CreateAspectForm.propTypes = {
  onCreated: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default CreateAspectForm;
