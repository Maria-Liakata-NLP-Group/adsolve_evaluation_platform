/** @format */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBreadcrumbs } from "../components/BreadcrumbContext";
import { useAdmin } from "../hooks/useAdmin";
import { getAspects, getMetrics, getPaths, createMetric, createAspect } from "../api/config";
import AspectDetail from "../components/AspectDetail";
import MetricDetail from "../components/MetricDetail";
import PathsMenu from "../components/PathsMenu";
import PathDetailPanel from "../components/PathDetailPanel";
import CreateNewRun from "../components/CreateNewRun";

const MODES = ["aspects", "metrics", "paths"];

const toSlug = (label) =>
  label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

const COMPUTE_OPTIONS = ["cpu_only", "gpu_available", "cloud_inference"];
const REFERENCE_OPTIONS = ["reference_free", "reference_based"];

const Library = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { isAdmin, token } = useAdmin();

  useEffect(() => {
    setBreadcrumbs([{ label: "Library" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const mode = searchParams.get("mode") ?? "aspects";
  const selectedId = searchParams.get("id") ?? null;

  const [aspects, setAspects] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Metric form state
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ label: "", description: "", tags: "", supported_compute_environments: [], supported_reference_modes: [] });
  const [addError, setAddError] = useState(null);
  const [addSaving, setAddSaving] = useState(false);

  // Add Aspect form state
  const [addingAspect, setAddingAspect] = useState(false);
  const [addAspectForm, setAddAspectForm] = useState({ label: "", description: "", metric_ids: [] });
  const [addAspectError, setAddAspectError] = useState(null);
  const [addAspectSaving, setAddAspectSaving] = useState(false);
  const [addAspectAllMetrics, setAddAspectAllMetrics] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [aspectData, metricData, pathData] = await Promise.all([
          getAspects(), getMetrics(), getPaths(),
        ]);
        setAspects(aspectData);
        setMetrics(metricData);
        setPaths(pathData);
      } catch {
        setError("Failed to load library data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const items = mode === "aspects" ? aspects : metrics;
  const view = searchParams.get("view") ?? null;

  const onSelectMode = (newMode) => { setAdding(false); setAddingAspect(false); setSearchParams({ mode: newMode }); };
  const onSelectItem = (id) => { setAdding(false); setAddingAspect(false); setSearchParams({ mode, id }); };
  const onSelectPath = (pathId) => setSearchParams({ mode: "paths", id: pathId });
  const onCreateRun = (pathId) => setSearchParams({ mode: "paths", id: pathId, view: "new-run" });
  const onNavigateToMetric = (metric) => setSearchParams({ mode: "metrics", id: metric.id });
  const onNavigateToAspect = (aspect) => setSearchParams({ mode: "aspects", id: aspect.id });

  const startAdding = () => {
    setAdding(true);
    setAddForm({ label: "", description: "", tags: "", supported_compute_environments: [], supported_reference_modes: [] });
    setAddError(null);
    setSearchParams({ mode: "metrics" });
  };

  const cancelAdding = () => setAdding(false);

  const handleCreate = async () => {
    setAddSaving(true);
    setAddError(null);
    try {
      const payload = {
        id: toSlug(addForm.label),
        label: addForm.label.trim(),
        description: addForm.description.trim() || null,
        tags: addForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        supported_compute_environments: addForm.supported_compute_environments,
        supported_reference_modes: addForm.supported_reference_modes,
      };
      const created = await createMetric(payload, token);
      setMetrics((prev) => [...prev, { id: created.id, label: created.label }]);
      setAdding(false);
      setSearchParams({ mode: "metrics", id: created.id });
    } catch (err) {
      setAddError(err.message ?? "Create failed. Please try again.");
    } finally {
      setAddSaving(false);
    }
  };

  const toggleAddArray = (field, value) => {
    setAddForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleMetricDeleted = () => {
    setMetrics((prev) => prev.filter((m) => m.id !== selectedId));
    setSearchParams({ mode: "metrics" });
  };

  const handleMetricUpdated = ({ id, label }) => {
    setMetrics((prev) => prev.map((m) => m.id === id ? { ...m, label } : m));
  };

  const startAddingAspect = async () => {
    try {
      const metrics = await getMetrics();
      setAddAspectAllMetrics(metrics);
    } catch {
      setAddAspectAllMetrics([]);
    }
    setAddingAspect(true);
    setAddAspectForm({ label: "", description: "", metric_ids: [] });
    setAddAspectError(null);
    setSearchParams({ mode: "aspects" });
  };

  const cancelAddingAspect = () => setAddingAspect(false);

  const handleCreateAspect = async () => {
    setAddAspectSaving(true);
    setAddAspectError(null);
    try {
      const payload = {
        id: toSlug(addAspectForm.label),
        label: addAspectForm.label.trim(),
        description: addAspectForm.description.trim() || null,
        metric_ids: addAspectForm.metric_ids,
      };
      const created = await createAspect(payload, token);
      setAspects((prev) => [...prev, { id: created.id, label: created.label }]);
      setAddingAspect(false);
      setSearchParams({ mode: "aspects", id: created.id });
    } catch (err) {
      setAddAspectError(err.message ?? "Create failed. Please try again.");
    } finally {
      setAddAspectSaving(false);
    }
  };

  const handleAspectDeleted = () => {
    setAspects((prev) => prev.filter((a) => a.id !== selectedId));
    setSearchParams({ mode: "aspects" });
  };

  const handleAspectUpdated = ({ id, label }) => {
    setAspects((prev) => prev.map((a) => a.id === id ? { ...a, label } : a));
  };

  if (loading) return <div className="section"><p>Loading…</p></div>;
  if (error) return <div className="section"><p className="has-text-danger">{error}</p></div>;

  const derivedId = toSlug(addForm.label);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 40px)", overflow: "hidden" }}>

      {/* Left panel */}
      <div style={{ width: "260px", flexShrink: 0, borderRight: "1px solid var(--bulma-border)", display: "flex", flexDirection: "column" }}>

        {/* Mode toggle */}
        <div style={{ padding: "0.75rem", borderBottom: "1px solid var(--bulma-border)" }}>
          <div className="buttons has-addons" style={{ margin: 0 }}>
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                className={`button is-small is-fullwidth ${mode === m ? "is-link is-selected" : ""}`}
                onClick={() => onSelectMode(m)}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Item list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
          {mode === "paths" ? (
            <PathsMenu paths={paths} selectedId={selectedId} onSelectPath={onSelectPath} />
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item.id)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "0.45rem 0.75rem", borderRadius: "6px", border: "none",
                  background: selectedId === item.id ? "var(--bulma-link-light)" : "transparent",
                  color: selectedId === item.id ? "var(--bulma-link)" : "inherit",
                  fontWeight: selectedId === item.id ? 600 : 400,
                  fontSize: "0.85rem", cursor: "pointer",
                }}
              >
                {item.label}
              </button>
            ))
          )}
        </div>

        {/* Add Metric button — visible to admins in metrics mode */}
        {isAdmin && mode === "metrics" && (
          <div style={{ padding: "0.6rem", borderTop: "1px solid var(--bulma-border)" }}>
            <button
              type="button"
              onClick={startAdding}
              style={{
                width: "100%", padding: "0.4rem", fontSize: "0.75rem",
                background: "rgba(255,196,81,0.1)", border: "1px dashed rgba(255,196,81,0.4)",
                color: "#ffc451", borderRadius: "4px", cursor: "pointer",
              }}
            >
              + Add Metric
            </button>
          </div>
        )}

        {/* Add Aspect button — visible to admins in aspects mode */}
        {isAdmin && mode === "aspects" && (
          <div style={{ padding: "0.6rem", borderTop: "1px solid var(--bulma-border)" }}>
            <button
              type="button"
              onClick={startAddingAspect}
              style={{
                width: "100%", padding: "0.4rem", fontSize: "0.75rem",
                background: "rgba(255,196,81,0.1)", border: "1px dashed rgba(255,196,81,0.4)",
                color: "#ffc451", borderRadius: "4px", cursor: "pointer",
              }}
            >
              + Add Aspect
            </button>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>

        {/* Add Metric form */}
        {adding && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.72rem", color: "#ffc451", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                New Metric
              </span>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button type="button" onClick={cancelAdding} style={secondaryBtn}>Cancel</button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={addSaving || !addForm.label.trim() || !derivedId}
                  style={{ ...primaryBtn, opacity: addSaving || !addForm.label.trim() || !derivedId ? 0.5 : 1 }}
                >
                  {addSaving ? "Creating…" : "Create"}
                </button>
              </div>
            </div>

            <label style={labelStyle}>ID <span style={{ color: "#666", fontStyle: "italic", fontSize: "0.68rem", textTransform: "none" }}>(auto-generated)</span></label>
            <input value={derivedId || "—"} disabled style={{ ...inputStyle, color: derivedId ? "#666" : "#e07070", marginBottom: derivedId ? "0.75rem" : "0.25rem" }} />
            {!derivedId && addForm.label.trim() && (
              <p style={{ color: "#e07070", fontSize: "0.72rem", marginBottom: "0.75rem" }}>
                Label must contain at least one letter or number.
              </p>
            )}

            <label style={labelStyle}>Label *</label>
            <input
              value={addForm.label}
              onChange={(e) => setAddForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="e.g. Conciseness"
              style={{ ...inputStyle, marginBottom: "0.75rem" }}
              autoFocus
            />

            <label style={labelStyle}>Description</label>
            <textarea
              value={addForm.description}
              onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Describe this metric…"
              style={{ ...inputStyle, resize: "vertical", marginBottom: "0.75rem" }}
            />

            <label style={labelStyle}>Tags <span style={{ color: "#666", fontWeight: 400 }}>(comma-separated)</span></label>
            <input
              value={addForm.tags}
              onChange={(e) => setAddForm((p) => ({ ...p, tags: e.target.value }))}
              placeholder="e.g. lexical, overlap"
              style={{ ...inputStyle, marginBottom: "0.75rem" }}
            />

            <label style={labelStyle}>Supported Compute Environments</label>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              {COMPUTE_OPTIONS.map((opt) => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", color: "#ccc", cursor: "pointer" }}>
                  <input type="checkbox" checked={addForm.supported_compute_environments.includes(opt)} onChange={() => toggleAddArray("supported_compute_environments", opt)} />
                  {opt}
                </label>
              ))}
            </div>

            <label style={labelStyle}>Supported Reference Modes</label>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {REFERENCE_OPTIONS.map((opt) => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", color: "#ccc", cursor: "pointer" }}>
                  <input type="checkbox" checked={addForm.supported_reference_modes.includes(opt)} onChange={() => toggleAddArray("supported_reference_modes", opt)} />
                  {opt}
                </label>
              ))}
            </div>

            {addError && <p style={{ color: "#e07070", fontSize: "0.8rem" }}>{addError}</p>}
          </>
        )}

        {/* Add Aspect form */}
        {addingAspect && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.72rem", color: "#ffc451", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                New Aspect
              </span>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button type="button" onClick={cancelAddingAspect} style={secondaryBtn}>Cancel</button>
                <button
                  type="button"
                  onClick={handleCreateAspect}
                  disabled={addAspectSaving || !addAspectForm.label.trim() || !toSlug(addAspectForm.label)}
                  style={{ ...primaryBtn, opacity: addAspectSaving || !addAspectForm.label.trim() || !toSlug(addAspectForm.label) ? 0.5 : 1 }}
                >
                  {addAspectSaving ? "Creating…" : "Create"}
                </button>
              </div>
            </div>

            <label style={labelStyle}>ID <span style={{ color: "#666", fontStyle: "italic", fontSize: "0.68rem", textTransform: "none" }}>(auto-generated)</span></label>
            <input value={toSlug(addAspectForm.label) || "—"} disabled style={{ ...inputStyle, color: toSlug(addAspectForm.label) ? "#666" : "#e07070", marginBottom: "0.75rem" }} />

            <label style={labelStyle}>Label *</label>
            <input
              value={addAspectForm.label}
              onChange={(e) => setAddAspectForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="e.g. Coherence"
              style={{ ...inputStyle, marginBottom: "0.75rem" }}
              autoFocus
            />

            <label style={labelStyle}>Description</label>
            <textarea
              value={addAspectForm.description}
              onChange={(e) => setAddAspectForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Describe this aspect…"
              style={{ ...inputStyle, resize: "vertical", marginBottom: "0.75rem" }}
            />

            <label style={labelStyle}>Metrics</label>
            {addAspectForm.metric_ids.length > 0 && (
              <div style={{ marginBottom: "0.5rem" }}>
                {addAspectAllMetrics
                  .filter((m) => addAspectForm.metric_ids.includes(m.id))
                  .map((m) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.3rem 0.5rem", background: "rgba(255,255,255,0.04)", borderRadius: "4px", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "0.82rem", color: "#ccc" }}>{m.label}</span>
                      <button
                        type="button"
                        onClick={() => setAddAspectForm((p) => ({ ...p, metric_ids: p.metric_ids.filter((id) => id !== m.id) }))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#e07070", fontSize: "0.78rem", padding: "0 0.25rem" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
              </div>
            )}
            {addAspectAllMetrics.filter((m) => !addAspectForm.metric_ids.includes(m.id)).length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) setAddAspectForm((p) => ({ ...p, metric_ids: [...p.metric_ids, id] }));
                  e.target.value = "";
                }}
                style={{ ...inputStyle, marginBottom: "0.75rem" }}
              >
                <option value="" disabled>Select a metric to add…</option>
                {addAspectAllMetrics
                  .filter((m) => !addAspectForm.metric_ids.includes(m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
              </select>
            )}

            {addAspectError && <p style={{ color: "#e07070", fontSize: "0.8rem" }}>{addAspectError}</p>}
          </>
        )}

        {/* Normal right-panel views */}
        {!adding && !addingAspect && mode === "aspects" && !selectedId && <p className="has-text-grey">Select an aspect from the list.</p>}
        {!adding && mode === "metrics" && !selectedId && <p className="has-text-grey">Select a metric from the list.</p>}
        {!adding && mode === "paths" && !selectedId && <p className="has-text-grey">Select a data source from the tree.</p>}

        {!adding && !addingAspect && selectedId && mode === "aspects" && (
          <AspectDetail
            aspectId={selectedId}
            onNavigateToMetric={onNavigateToMetric}
            onNavigateToPath={onSelectPath}
            onDeleted={handleAspectDeleted}
            onUpdated={handleAspectUpdated}
          />
        )}
        {!adding && selectedId && mode === "metrics" && (
          <MetricDetail
            metricId={selectedId}
            onNavigateToAspect={onNavigateToAspect}
            onDeleted={handleMetricDeleted}
            onUpdated={handleMetricUpdated}
          />
        )}
        {!adding && selectedId && mode === "paths" && view !== "new-run" && (
          <PathDetailPanel pathId={selectedId} onCreateRun={onCreateRun} onNavigateToAspect={onNavigateToAspect} />
        )}
        {!adding && selectedId && mode === "paths" && view === "new-run" && (
          <CreateNewRun pathId={selectedId} onCancel={() => setSearchParams({ mode: "paths", id: selectedId })} />
        )}
      </div>
    </div>
  );
};

const primaryBtn = {
  background: "#ffc451", color: "#151515", border: "none",
  padding: "0.3rem 0.8rem", borderRadius: "4px",
  fontFamily: '"Raleway", sans-serif', fontWeight: 700,
  fontSize: "0.78rem", cursor: "pointer",
};

const secondaryBtn = {
  background: "transparent", color: "#aaa", border: "1px solid #444",
  padding: "0.3rem 0.8rem", borderRadius: "4px", fontSize: "0.78rem", cursor: "pointer",
};

const labelStyle = {
  display: "block", fontSize: "0.7rem", color: "#666",
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem",
};

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.06)", border: "1px solid #444",
  borderRadius: "4px", color: "#fff", padding: "0.4rem 0.6rem", fontSize: "0.85rem",
};

export default Library;
