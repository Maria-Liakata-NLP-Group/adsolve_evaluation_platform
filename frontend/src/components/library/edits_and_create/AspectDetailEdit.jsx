/** @format */

import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { getMetrics, updateAspect } from "../../../api/config";
import { useAdmin } from "../../../hooks/useAdmin";
import AdminEditHeader from "../../navigation_and_controls/AdminEditHeader";

const AspectDetailEdit = ({ aspect, paths, onSaved, onCancel }) => {
  const { token } = useAdmin();
  const [form, setForm] = useState({
    label: aspect.label,
    description: aspect.description ?? "",
    metric_ids: (aspect.metrics ?? []).map((m) => m.id),
  });
  const [allMetrics, setAllMetrics] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    getMetrics().then(setAllMetrics).catch(() => setAllMetrics([]));
  }, []);

  const canRemoveMetric = (metricId) =>
    !paths.some((p) => p.metrics.some((m) => m.id === metricId));

  const removeMetric = (metricId) =>
    setForm((prev) => ({
      ...prev,
      metric_ids: prev.metric_ids.filter((id) => id !== metricId),
    }));

  const addMetric = (metricId) => {
    if (!metricId || form.metric_ids.includes(metricId)) return;
    setForm((prev) => ({ ...prev, metric_ids: [...prev.metric_ids, metricId] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateAspect(aspect.id, {
        id: aspect.id,
        label: form.label.trim(),
        description: form.description.trim() || null,
        metric_ids: form.metric_ids,
      }, token);
      onSaved(updated);
    } catch (err) {
      setSaveError(err.message ?? "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const assignedSet = new Set(form.metric_ids);
  const availableToAdd = allMetrics.filter((m) => !assignedSet.has(m.id));
  const assignedMetrics = allMetrics.filter((m) => assignedSet.has(m.id));

  return (
    <>
      <AdminEditHeader
        title="Editing aspect"
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

      <label className="admin-label">Metrics</label>
      <div style={{ marginBottom: "0.5rem" }}>
        {assignedMetrics.length === 0 && (
          <p style={{ fontSize: "0.78rem", color: "#666", marginBottom: "0.5rem" }}>
            No metrics assigned.
          </p>
        )}
        {assignedMetrics.map((m) => {
          const removable = canRemoveMetric(m.id);
          return (
            <div key={m.id} className="admin-metric-row">
              <span className="admin-metric-label">{m.label}</span>
              <button
                type="button"
                onClick={() => removable && removeMetric(m.id)}
                disabled={!removable}
                title={!removable ? "Used in a path — cannot remove" : "Remove from pool"}
                className={removable ? "admin-metric-remove" : "admin-metric-remove--locked"}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {availableToAdd.length > 0 && (
        <>
          <label className="admin-label">Add metric</label>
          <select
            defaultValue=""
            onChange={(e) => { addMetric(e.target.value); e.target.value = ""; }}
            className="admin-input"
            style={{ marginBottom: "1rem" }}
          >
            <option value="" disabled>Select a metric to add…</option>
            {availableToAdd.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </>
      )}

      {saveError && <p className="text-error">{saveError}</p>}
    </>
  );
};

AspectDetailEdit.propTypes = {
  aspect: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string,
    metrics: PropTypes.array,
  }).isRequired,
  paths: PropTypes.arrayOf(
    PropTypes.shape({
      metrics: PropTypes.arrayOf(
        PropTypes.shape({ id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) })
      ),
    })
  ).isRequired,
  onSaved: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default AspectDetailEdit;
