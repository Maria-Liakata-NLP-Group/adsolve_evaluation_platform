/** @format */

import { useEffect, useState } from "react";
import { getMetrics, updatePathAspect } from "../../api/config";
import { useAdmin } from "../../hooks/useAdmin";

// Convert newline-separated textarea value to array of strings
const parseLines = (text) =>
  text.split("\n").map((s) => s.trim()).filter(Boolean);

const PathAspectEditForm = ({ aspect, pathId, runMetricIds, onSave, onCancel }) => {
  const { token } = useAdmin();
  const [allMetrics, setAllMetrics] = useState([]);
  const [definition, setDefinition] = useState(aspect.definition ?? "");
  const [originalPostsText, setOriginalPostsText] = useState(
    (aspect.examples?.original_posts ?? []).join("\n")
  );
  const [goodSummary, setGoodSummary] = useState(aspect.examples?.good_summary ?? "");
  const [whyGood, setWhyGood] = useState(aspect.examples?.why_good ?? "");
  const [badSummary, setBadSummary] = useState(aspect.examples?.bad_summary ?? "");
  const [whyBad, setWhyBad] = useState(aspect.examples?.why_bad ?? "");
  const [requirements, setRequirements] = useState(
    aspect.stakeholder_requirements?.items ?? []
  );
  const [metricIds, setMetricIds] = useState(aspect.metrics.map((m) => m.id));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    getMetrics().then(setAllMetrics).catch(() => setAllMetrics([]));
  }, []);

  const addRequirement = () => setRequirements((prev) => [...prev, ""]);

  const updateRequirement = (index, value) =>
    setRequirements((prev) => prev.map((r, i) => (i === index ? value : r)));

  const removeRequirement = (index) =>
    setRequirements((prev) => prev.filter((_, i) => i !== index));

  const addMetric = (metricId) => {
    if (metricId && !metricIds.includes(metricId))
      setMetricIds((prev) => [...prev, metricId]);
  };

  const removeMetric = (metricId) => {
    if (!runMetricIds.includes(metricId))
      setMetricIds((prev) => prev.filter((id) => id !== metricId));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        definition: definition.trim() || null,
        examples: {
          original_posts: parseLines(originalPostsText),
          good_summary: goodSummary.trim() || null,
          why_good: whyGood.trim() || null,
          bad_summary: badSummary.trim() || null,
          why_bad: whyBad.trim() || null,
        },
        stakeholder_requirements: {
          items: requirements.map((r) => r.trim()).filter(Boolean),
        },
        metric_ids: metricIds,
      };
      const updated = await updatePathAspect(pathId, aspect.id, payload, token);
      onSave(updated);
    } catch (err) {
      setSaveError(err.message ?? "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const assignedMetrics = allMetrics.filter((m) => metricIds.includes(m.id));
  const availableToAdd = allMetrics.filter((m) => !metricIds.includes(m.id));

  return (
    <div style={{ border: "1px solid #333", borderRadius: "6px", padding: "1rem", marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "0.72rem", color: "#ffc451", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Editing: {aspect.label}
        </span>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button type="button" onClick={onCancel} className="admin-btn-secondary">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="admin-btn-primary" style={{ opacity: saving ? 0.5 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <label className="admin-label">Definition</label>
      <textarea value={definition} onChange={(e) => setDefinition(e.target.value)}
        rows={3} className="admin-input" style={{ resize: "vertical", marginBottom: "0.75rem" }} />

      <p style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.5rem", marginBottom: "0.4rem" }}>
        Examples
      </p>

      <label className="admin-label">Original posts <span style={{ color: "#555", fontWeight: 400, textTransform: "none" }}>(one per line)</span></label>
      <textarea value={originalPostsText} onChange={(e) => setOriginalPostsText(e.target.value)}
        rows={3} className="admin-input" style={{ resize: "vertical", marginBottom: "0.75rem" }} />

      <label className="admin-label">Good summary</label>
      <textarea value={goodSummary} onChange={(e) => setGoodSummary(e.target.value)}
        rows={2} className="admin-input" style={{ resize: "vertical", marginBottom: "0.75rem" }} />

      <label className="admin-label">Why this is good</label>
      <textarea value={whyGood} onChange={(e) => setWhyGood(e.target.value)}
        rows={2} className="admin-input" style={{ resize: "vertical", marginBottom: "0.75rem" }} />

      <label className="admin-label">Bad summary</label>
      <textarea value={badSummary} onChange={(e) => setBadSummary(e.target.value)}
        rows={2} className="admin-input" style={{ resize: "vertical", marginBottom: "0.75rem" }} />

      <label className="admin-label">Why this is bad</label>
      <textarea value={whyBad} onChange={(e) => setWhyBad(e.target.value)}
        rows={2} className="admin-input" style={{ resize: "vertical", marginBottom: "0.75rem" }} />

      <label className="admin-label">Stakeholder requirements</label>
      {requirements.map((req, index) => (
        <div key={index} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem" }}>
          <input value={req} onChange={(e) => updateRequirement(index, e.target.value)}
            placeholder="Requirement…" className="admin-input" style={{ flex: 1 }} />
          <button type="button" onClick={() => removeRequirement(index)}
            style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: "0.85rem" }}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={addRequirement} className="admin-btn-add-inline">
        + Add requirement
      </button>

      <label className="admin-label">Metrics</label>
      {assignedMetrics.length === 0 && (
        <p style={{ fontSize: "0.78rem", color: "#666", marginBottom: "0.5rem" }}>No metrics assigned.</p>
      )}
      {assignedMetrics.map((m) => {
        const locked = runMetricIds.includes(m.id);
        return (
          <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.3rem 0.5rem", background: "rgba(255,255,255,0.04)", borderRadius: "4px", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#ccc" }}>{m.label}</span>
            <button type="button" onClick={() => removeMetric(m.id)} disabled={locked}
              title={locked ? "Used in a run — cannot remove" : "Remove"}
              style={{ background: "none", border: "none", cursor: locked ? "not-allowed" : "pointer", color: locked ? "#555" : "#e07070", fontSize: "0.78rem", padding: "0 0.25rem" }}>
              ✕
            </button>
          </div>
        );
      })}
      {availableToAdd.length > 0 && (
        <select defaultValue=""
          onChange={(e) => { addMetric(e.target.value); e.target.value = ""; }}
          className="admin-input" style={{ marginBottom: "0.75rem" }}>
          <option value="" disabled>Select a metric to add…</option>
          {availableToAdd.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      )}

      {saveError && <p style={{ color: "#e07070", fontSize: "0.8rem" }}>{saveError}</p>}
    </div>
  );
};

export default PathAspectEditForm;
