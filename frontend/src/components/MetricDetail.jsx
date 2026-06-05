/** @format */

import { useEffect, useState } from "react";
import { getMetric, updateMetric, deleteMetric } from "../api/config";
import { useAdmin } from "../hooks/useAdmin";
import AdminItemActions from "./AdminItemActions";
import AssociatedItems from "./AssociatedItems";
import DescriptionSection from "./DescriptionSection";

const COMPUTE_OPTIONS = ["cpu_only", "gpu_available", "cloud_inference"];
const REFERENCE_OPTIONS = ["reference_free", "reference_based"];

const toItems = (strings) => (strings ?? []).map((s) => ({ id: s, label: s }));

const MetricDetail = ({ metricId, onNavigateToAspect, onDeleted, onUpdated }) => {
  const { token } = useAdmin();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (!metricId) return;
    setEditing(false);
    setSaveError(null);
    setDeleteError(null);
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const data = await getMetric(metricId);
        setDetail(data);
      } catch {
        setDetail(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [metricId]);

  const canDelete = (detail?.aspects ?? []).length === 0;
  const blockingMessage = canDelete
    ? null
    : `Linked to ${detail.aspects.length} aspect(s) — remove those links before deleting.`;

  const startEdit = () => {
    setForm({
      label: detail.label,
      description: detail.description ?? "",
      tags: (detail.tags ?? []).join(", "),
      supported_compute_environments: detail.supported_compute_environments ?? [],
      supported_reference_modes: detail.supported_reference_modes ?? [],
    });
    setSaveError(null);
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
        id: metricId,
        label: form.label.trim(),
        description: form.description.trim() || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        supported_compute_environments: form.supported_compute_environments,
        supported_reference_modes: form.supported_reference_modes,
      };
      const updated = await updateMetric(metricId, payload, token);
      setDetail(updated);
      setEditing(false);
      onUpdated?.({ id: metricId, label: updated.label });
    } catch (err) {
      setSaveError(err.message ?? "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteMetric(metricId, token);
      onDeleted?.();
    } catch (err) {
      setDeleteError(err.message ?? "Delete failed. Please try again.");
    }
  };

  const toggleArrayValue = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  if (!detail && !loading) return null;

  if (editing && form) {
    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ fontSize: "0.72rem", color: "#ffc451", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Editing metric
          </span>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button type="button" onClick={cancelEdit} className="admin-btn-secondary">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving || !form.label.trim()} className="admin-btn-primary" style={{ opacity: saving || !form.label.trim() ? 0.5 : 1 }}>
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

        <label className="admin-label">Tags <span style={{ color: "#666", fontWeight: 400 }}>(comma-separated)</span></label>
        <input
          value={form.tags}
          onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
          placeholder="e.g. lexical, overlap"
          className="admin-input"
        />

        <label className="admin-label">Supported Compute Environments</label>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {COMPUTE_OPTIONS.map((opt) => (
            <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", color: "#ccc", cursor: "pointer" }}>
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
            <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", color: "#ccc", cursor: "pointer" }}>
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
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
        <p className="is-size-7 has-text-grey is-uppercase" style={{ letterSpacing: "0.08em" }}>
          Metric
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
      <div style={{ marginBottom: "1rem" }}>
        <AssociatedItems label="Tags" items={toItems(detail?.tags)} loading={loading} />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <AssociatedItems label="Supported Reference Modes" items={toItems(detail?.supported_reference_modes)} loading={loading} />
      </div>
      <div style={{ marginBottom: "1.5rem" }}>
        <AssociatedItems label="Supported Compute Environments" items={toItems(detail?.supported_compute_environments)} loading={loading} />
      </div>
      <AssociatedItems label="Associated Aspects" items={detail?.aspects ?? []} loading={loading} onItemClick={onNavigateToAspect} />
    </>
  );
};

export default MetricDetail;
