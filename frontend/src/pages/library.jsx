/** @format */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBreadcrumbs } from "../components/BreadcrumbContext";
import { useAdmin } from "../hooks/useAdmin";
import { getAspects, getMetrics, getPaths, getUseCases, getTasks, createMetric, createAspect, createPath } from "../api/config";
import AspectDetail from "../components/AspectDetail";
import MetricDetail from "../components/MetricDetail";
import PathsMenu from "../components/PathsMenu";
import PathDetailPanel from "../components/PathDetailPanel";
import CreateNewRun from "../components/CreateNewRun";

const MODES = ["aspects", "metrics", "paths"];
const MODE_LABELS = { aspects: "ASPECTS", metrics: "METRICS", paths: "TASKS" };

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

  // Add Task form state
  const [addingPath, setAddingPath] = useState(false);
  const [addPathForm, setAddPathForm] = useState({
    use_case_id: "", task_id: "", task_label: "",
    data_source_label: "", data_source_description: "", task_description: "",
  });
  const [addPathUseCases, setAddPathUseCases] = useState([]);
  const [addPathTasks, setAddPathTasks] = useState([]);
  const [addPathError, setAddPathError] = useState(null);
  const [addPathSaving, setAddPathSaving] = useState(false);

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

  const onSelectMode = (newMode) => { setAdding(false); setAddingAspect(false); setAddingPath(false); setSearchParams({ mode: newMode }); };
  const onSelectItem = (id) => { setAdding(false); setAddingAspect(false); setSearchParams({ mode, id }); };
  const onSelectPath = (pathId) => { setAddingPath(false); setSearchParams({ mode: "paths", id: pathId }); };
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

  const startAddingPath = async () => {
    try {
      const [useCaseData, taskData] = await Promise.all([getUseCases(), getTasks()]);
      setAddPathUseCases(useCaseData);
      setAddPathTasks(taskData);
    } catch {
      setAddPathUseCases([]);
      setAddPathTasks([]);
    }
    setAddingPath(true);
    setAddPathForm({ use_case_id: "", task_id: "", task_label: "", data_source_label: "", data_source_description: "", task_description: "" });
    setAddPathError(null);
    setSearchParams({ mode: "paths" });
  };

  const cancelAddingPath = () => setAddingPath(false);

  const handleCreatePath = async () => {
    setAddPathSaving(true);
    setAddPathError(null);
    try {
      const isNewTask = addPathForm.task_id === "__new__";
      const payload = {
        use_case_id: addPathForm.use_case_id,
        task_id: isNewTask ? null : addPathForm.task_id,
        task_label: isNewTask ? addPathForm.task_label.trim() : null,
        data_source_label: addPathForm.data_source_label.trim(),
        data_source_description: addPathForm.data_source_description.trim() || null,
        task_description: addPathForm.task_description.trim() || null,
      };
      const created = await createPath(payload, token);
      setPaths((prev) => [...prev, {
        id: created.id,
        use_case_id: created.use_case_id,
        use_case_label: created.use_case_label,
        task_id: created.task_id,
        task_label: created.task_label,
        data_source_id: created.data_source_id,
        data_source_label: created.data_source_label,
      }]);
      setAddingPath(false);
      setSearchParams({ mode: "paths", id: created.id });
    } catch (err) {
      setAddPathError(err.message ?? "Create failed. Please try again.");
    } finally {
      setAddPathSaving(false);
    }
  };

  const handlePathDeleted = () => {
    setPaths((prev) => prev.filter((p) => p.id !== selectedId));
    setSearchParams({ mode: "paths" });
  };

  const handlePathUpdated = ({ id, data_source_label }) => {
    setPaths((prev) => prev.map((p) => p.id === id ? { ...p, data_source_label } : p));
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
                {MODE_LABELS[m]}
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

        {/* Add Task button — visible to admins in paths mode */}
        {isAdmin && mode === "paths" && (
          <div style={{ padding: "0.6rem", borderTop: "1px solid var(--bulma-border)" }}>
            <button
              type="button"
              onClick={startAddingPath}
              style={{
                width: "100%", padding: "0.4rem", fontSize: "0.75rem",
                background: "rgba(255,196,81,0.1)", border: "1px dashed rgba(255,196,81,0.4)",
                color: "#ffc451", borderRadius: "4px", cursor: "pointer",
              }}
            >
              + Add Task
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
                <button type="button" onClick={cancelAdding} className="admin-btn-secondary">Cancel</button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={addSaving || !addForm.label.trim() || !derivedId}
                  className="admin-btn-primary"
                  style={{ opacity: addSaving || !addForm.label.trim() || !derivedId ? 0.5 : 1 }}
                >
                  {addSaving ? "Creating…" : "Create"}
                </button>
              </div>
            </div>

            <label className="admin-label">ID <span style={{ color: "#666", fontStyle: "italic", fontSize: "0.68rem", textTransform: "none" }}>(auto-generated)</span></label>
            <input value={derivedId || "—"} disabled className="admin-input" style={{ color: derivedId ? "#666" : "#e07070", marginBottom: derivedId ? "0.75rem" : "0.25rem" }} />
            {!derivedId && addForm.label.trim() && (
              <p style={{ color: "#e07070", fontSize: "0.72rem", marginBottom: "0.75rem" }}>
                Label must contain at least one letter or number.
              </p>
            )}

            <label className="admin-label">Label *</label>
            <input
              value={addForm.label}
              onChange={(e) => setAddForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="e.g. Conciseness"
              className="admin-input"
              style={{ marginBottom: "0.75rem" }}
              autoFocus
            />

            <label className="admin-label">Description</label>
            <textarea
              value={addForm.description}
              onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Describe this metric…"
              className="admin-input"
              style={{ resize: "vertical", marginBottom: "0.75rem" }}
            />

            <label className="admin-label">Tags <span style={{ color: "#666", fontWeight: 400 }}>(comma-separated)</span></label>
            <input
              value={addForm.tags}
              onChange={(e) => setAddForm((p) => ({ ...p, tags: e.target.value }))}
              placeholder="e.g. lexical, overlap"
              className="admin-input"
              style={{ marginBottom: "0.75rem" }}
            />

            <label className="admin-label">Supported Compute Environments</label>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              {COMPUTE_OPTIONS.map((opt) => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", color: "#ccc", cursor: "pointer" }}>
                  <input type="checkbox" checked={addForm.supported_compute_environments.includes(opt)} onChange={() => toggleAddArray("supported_compute_environments", opt)} />
                  {opt}
                </label>
              ))}
            </div>

            <label className="admin-label">Supported Reference Modes</label>
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
                <button type="button" onClick={cancelAddingAspect} className="admin-btn-secondary">Cancel</button>
                <button
                  type="button"
                  onClick={handleCreateAspect}
                  disabled={addAspectSaving || !addAspectForm.label.trim() || !toSlug(addAspectForm.label)}
                  className="admin-btn-primary"
                  style={{ opacity: addAspectSaving || !addAspectForm.label.trim() || !toSlug(addAspectForm.label) ? 0.5 : 1 }}
                >
                  {addAspectSaving ? "Creating…" : "Create"}
                </button>
              </div>
            </div>

            <label className="admin-label">ID <span style={{ color: "#666", fontStyle: "italic", fontSize: "0.68rem", textTransform: "none" }}>(auto-generated)</span></label>
            <input value={toSlug(addAspectForm.label) || "—"} disabled className="admin-input" style={{ color: toSlug(addAspectForm.label) ? "#666" : "#e07070", marginBottom: "0.75rem" }} />

            <label className="admin-label">Label *</label>
            <input
              value={addAspectForm.label}
              onChange={(e) => setAddAspectForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="e.g. Coherence"
              className="admin-input"
              style={{ marginBottom: "0.75rem" }}
              autoFocus
            />

            <label className="admin-label">Description</label>
            <textarea
              value={addAspectForm.description}
              onChange={(e) => setAddAspectForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Describe this aspect…"
              className="admin-input"
              style={{ resize: "vertical", marginBottom: "0.75rem" }}
            />

            <label className="admin-label">Metrics</label>
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
                className="admin-input"
              style={{ marginBottom: "0.75rem" }}
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

        {/* Add Task form */}
        {addingPath && (() => {
          const derivedPathId = toSlug(addPathForm.data_source_label);
          const isNewTask = addPathForm.task_id === "__new__";
          const taskOk = (addPathForm.task_id && !isNewTask) || (isNewTask && addPathForm.task_label.trim());
          const isValid = addPathForm.use_case_id && taskOk && derivedPathId;
          return (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontSize: "0.72rem", color: "#ffc451", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  New Task
                </span>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button type="button" onClick={cancelAddingPath} className="admin-btn-secondary">Cancel</button>
                  <button type="button" onClick={handleCreatePath}
                    disabled={addPathSaving || !isValid}
                    className="admin-btn-primary"
                    style={{ opacity: addPathSaving || !isValid ? 0.5 : 1 }}>
                    {addPathSaving ? "Creating…" : "Create"}
                  </button>
                </div>
              </div>

              <label className="admin-label">Use case *</label>
              <select value={addPathForm.use_case_id}
                onChange={(e) => setAddPathForm((p) => ({ ...p, use_case_id: e.target.value }))}
                className="admin-input"
                style={{ marginBottom: "0.75rem" }}>
                <option value="" disabled>Select a use case…</option>
                {addPathUseCases.map((uc) => (
                  <option key={uc.id} value={uc.id}>{uc.label}</option>
                ))}
              </select>

              <label className="admin-label">Task *</label>
              <select value={addPathForm.task_id}
                onChange={(e) => setAddPathForm((p) => ({ ...p, task_id: e.target.value, task_label: "" }))}
                className="admin-input"
                style={{ marginBottom: "0.5rem" }}>
                <option value="" disabled>Select a task…</option>
                {addPathTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
                <option value="__new__">— New task —</option>
              </select>

              {isNewTask && (
                <>
                  <label className="admin-label">New task label *</label>
                  <input value={addPathForm.task_label}
                    onChange={(e) => setAddPathForm((p) => ({ ...p, task_label: e.target.value }))}
                    placeholder="e.g. Summarisation"
                    className="admin-input"
                    style={{ marginBottom: "0.75rem" }} />
                </>
              )}

              <label className="admin-label">Data source label * <span style={{ color: "#666", fontStyle: "italic", fontSize: "0.68rem", textTransform: "none" }}>(ID: {derivedPathId || "—"})</span></label>
              <input value={addPathForm.data_source_label}
                onChange={(e) => setAddPathForm((p) => ({ ...p, data_source_label: e.target.value }))}
                placeholder="e.g. Social Media Posts"
                className="admin-input"
                style={{ marginBottom: "0.75rem" }}
                autoFocus />

              <label className="admin-label">Task description</label>
              <textarea value={addPathForm.task_description}
                onChange={(e) => setAddPathForm((p) => ({ ...p, task_description: e.target.value }))}
                rows={3} placeholder="Describe the task…"
                className="admin-input"
                style={{ resize: "vertical", marginBottom: "0.75rem" }} />

              <label className="admin-label">Data source description</label>
              <textarea value={addPathForm.data_source_description}
                onChange={(e) => setAddPathForm((p) => ({ ...p, data_source_description: e.target.value }))}
                rows={3} placeholder="Describe the data source…"
                className="admin-input"
                style={{ resize: "vertical", marginBottom: "0.75rem" }} />

              {addPathError && <p style={{ color: "#e07070", fontSize: "0.8rem" }}>{addPathError}</p>}
            </>
          );
        })()}

        {/* Normal right-panel views */}
        {!adding && !addingAspect && mode === "aspects" && !selectedId && <p className="has-text-grey">Select an aspect from the list.</p>}
        {!adding && mode === "metrics" && !selectedId && <p className="has-text-grey">Select a metric from the list.</p>}
        {!adding && mode === "paths" && !selectedId && !addingPath && <p className="has-text-grey">Select a data source from the tree.</p>}

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
        {!adding && !addingPath && selectedId && mode === "paths" && view !== "new-run" && (
          <PathDetailPanel
            pathId={selectedId}
            onCreateRun={onCreateRun}
            onNavigateToAspect={onNavigateToAspect}
            onDeleted={handlePathDeleted}
            onUpdated={handlePathUpdated}
          />
        )}
        {!adding && selectedId && mode === "paths" && view === "new-run" && (
          <CreateNewRun pathId={selectedId} onCancel={() => setSearchParams({ mode: "paths", id: selectedId })} />
        )}
      </div>
    </div>
  );
};

export default Library;
