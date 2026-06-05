/** @format */

import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { getAspect, getAspectPaths, getMetrics, updateAspect, deleteAspect } from "../api/config";
import { useAdmin } from "../hooks/useAdmin";
import AdminItemActions from "./AdminItemActions";
import AssociatedItems from "./AssociatedItems";
import DescriptionSection from "./DescriptionSection";
import PathAspectCard from "./PathAspectCard";

const AspectDetail = ({ aspectId, onNavigateToMetric, onNavigateToPath, onDeleted, onUpdated }) => {
  const { token } = useAdmin();
  const [detail, setDetail] = useState(null);
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [allMetrics, setAllMetrics] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (!aspectId) return;
    setEditing(false);
    setDetail(null);
    setPaths([]);
    setSaveError(null);
    setDeleteError(null);
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [aspectData, pathData] = await Promise.all([
          getAspect(aspectId),
          getAspectPaths(aspectId),
        ]);
        setDetail(aspectData);
        setPaths(pathData);
      } catch {
        setDetail(null);
        setPaths([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [aspectId]);

  const canDelete = paths.length === 0;
  const blockingMessage = canDelete
    ? null
    : `Used in ${paths.length} path(s) — remove those links before deleting.`;

  // A metric can only be removed from the pool if no path uses it for this aspect
  const canRemoveMetric = (metricId) =>
    !paths.some((p) => p.metrics.some((m) => m.id === metricId));

  const startEdit = async () => {
    setSaveError(null);
    try {
      const metrics = await getMetrics();
      setAllMetrics(metrics);
    } catch {
      setAllMetrics([]);
    }
    setForm({
      label: detail.label,
      description: detail.description ?? "",
      metric_ids: (detail.metrics ?? []).map((m) => m.id),
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        id: aspectId,
        label: form.label.trim(),
        description: form.description.trim() || null,
        metric_ids: form.metric_ids,
      };
      const updated = await updateAspect(aspectId, payload, token);
      setDetail(updated);
      setEditing(false);
      onUpdated?.({ id: aspectId, label: updated.label });
    } catch (err) {
      setSaveError(err.message ?? "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteAspect(aspectId, token);
      onDeleted?.();
    } catch (err) {
      setDeleteError(err.message ?? "Delete failed. Please try again.");
    }
  };

  const removeMetric = (metricId) => {
    setForm((prev) => ({
      ...prev,
      metric_ids: prev.metric_ids.filter((id) => id !== metricId),
    }));
  };

  const addMetric = (metricId) => {
    if (!metricId || form.metric_ids.includes(metricId)) return;
    setForm((prev) => ({ ...prev, metric_ids: [...prev.metric_ids, metricId] }));
  };

  if (!detail && !loading) return null;

  if (editing && form) {
    const assignedSet = new Set(form.metric_ids);
    const availableToAdd = allMetrics.filter((m) => !assignedSet.has(m.id));
    const assignedMetrics = allMetrics.filter((m) => assignedSet.has(m.id));

    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ fontSize: "0.72rem", color: "#ffc451", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Editing aspect
          </span>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button type="button" onClick={cancelEdit} className="admin-btn-secondary">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving || !form.label.trim()}
              className="admin-btn-primary" style={{ opacity: saving || !form.label.trim() ? 0.5 : 1 }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

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
            <p style={{ fontSize: "0.78rem", color: "#666", marginBottom: "0.5rem" }}>No metrics assigned.</p>
          )}
          {assignedMetrics.map((m) => {
            const removable = canRemoveMetric(m.id);
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.3rem 0.5rem", background: "rgba(255,255,255,0.04)", borderRadius: "4px", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "0.82rem", color: "#ccc" }}>{m.label}</span>
                <button
                  type="button"
                  onClick={() => removable && removeMetric(m.id)}
                  disabled={!removable}
                  title={!removable ? "Used in a path — cannot remove" : "Remove from pool"}
                  style={{ background: "none", border: "none", cursor: removable ? "pointer" : "not-allowed", color: removable ? "#e07070" : "#555", fontSize: "0.78rem", padding: "0 0.25rem" }}
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

        {saveError && <p style={{ color: "#e07070", fontSize: "0.8rem" }}>{saveError}</p>}
      </>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
        <p className="is-size-7 has-text-grey is-uppercase" style={{ letterSpacing: "0.08em" }}>
          Aspect
        </p>
        <AdminItemActions
          canDelete={canDelete}
          blockingMessage={blockingMessage}
          onEdit={startEdit}
          onDelete={handleDelete}
        />
      </div>

      <h2 className="title is-4" style={{ marginBottom: "1.5rem" }}>
        {detail?.label}
      </h2>

      {deleteError && (
        <p style={{ color: "#e07070", fontSize: "0.8rem", marginBottom: "1rem" }}>{deleteError}</p>
      )}

      <DescriptionSection description={detail?.description} />
      <AssociatedItems
        label="Associated Metrics"
        items={detail?.metrics ?? []}
        loading={loading}
        onItemClick={onNavigateToMetric}
      />

      <div style={{ marginTop: "2rem" }}>
        <p className="is-size-7 is-uppercase has-text-grey" style={{ letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
          Used in Tasks
        </p>
        {loading ? (
          <p className="has-text-grey is-italic">Loading…</p>
        ) : paths.length === 0 ? (
          <p className="has-text-grey is-italic">Not used in any paths yet.</p>
        ) : (
          <div className="columns is-multiline">
            {paths.map((path) => (
              <div key={path.path_id} className="column is-6">
                <PathAspectCard
                  label={detail?.label}
                  examples={path.examples}
                  stakeholderRequirements={path.stakeholder_requirements}
                  metrics={path.metrics}
                  onClick={onNavigateToPath ? () => onNavigateToPath(path.path_id) : undefined}
                >
                  <p className="is-size-7 has-text-grey mb-1">
                    {path.use_case_label} · {path.task_label}
                  </p>
                  <p className="has-text-weight-semibold mb-2">{path.data_source_label}</p>
                  {path.definition && <p className="is-size-7">{path.definition}</p>}
                </PathAspectCard>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

AspectDetail.propTypes = {
  aspectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onNavigateToMetric: PropTypes.func,
  onNavigateToPath: PropTypes.func,
  onDeleted: PropTypes.func,
  onUpdated: PropTypes.func,
};

export default AspectDetail;
