/** @format */

import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { createPath, getUseCases, getTasks } from "../../../api/config";
import { useAdmin } from "../../../hooks/useAdmin";
import AdminCreateHeader from "../../navigation_and_controls/AdminCreateHeader";
import { toSlug } from "../../../utils/slug";

const EMPTY_FORM = {
  use_case_id: "",
  task_id: "",
  task_label: "",
  data_source_label: "",
  data_source_description: "",
  task_description: "",
};

const CreateTaskForm = ({ onCreated, onCancel }) => {
  const { token } = useAdmin();
  const [form, setForm] = useState(EMPTY_FORM);
  const [useCases, setUseCases] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const derivedId = toSlug(form.data_source_label);
  const isNewTask = form.task_id === "__new__";
  const taskOk = (form.task_id && !isNewTask) || (isNewTask && form.task_label.trim());
  const canCreate = !!(form.use_case_id && taskOk && derivedId);

  useEffect(() => {
    Promise.all([getUseCases(), getTasks()])
      .then(([ucData, taskData]) => {
        setUseCases(ucData);
        setTasks(taskData);
      })
      .catch(() => {
        setUseCases([]);
        setTasks([]);
      });
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const payload = {
        use_case_id: form.use_case_id,
        task_id: isNewTask ? null : form.task_id,
        task_label: isNewTask ? form.task_label.trim() : null,
        data_source_label: form.data_source_label.trim(),
        data_source_description: form.data_source_description.trim() || null,
        task_description: form.task_description.trim() || null,
      };
      const created = await createPath(payload, token);
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
        title="New Task"
        onCancel={onCancel}
        onCreate={handleCreate}
        creating={creating}
        canCreate={canCreate}
      />

      <label className="admin-label">Use case *</label>
      <select
        value={form.use_case_id}
        onChange={(e) => setForm((p) => ({ ...p, use_case_id: e.target.value }))}
        className="admin-input"
        style={{ marginBottom: "0.75rem" }}
      >
        <option value="" disabled>Select a use case…</option>
        {useCases.map((uc) => (
          <option key={uc.id} value={uc.id}>{uc.label}</option>
        ))}
      </select>

      <label className="admin-label">Task *</label>
      <select
        value={form.task_id}
        onChange={(e) =>
          setForm((p) => ({ ...p, task_id: e.target.value, task_label: "" }))
        }
        className="admin-input"
        style={{ marginBottom: "0.5rem" }}
      >
        <option value="" disabled>Select a task…</option>
        {tasks.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
        <option value="__new__">— New task —</option>
      </select>

      {isNewTask && (
        <>
          <label className="admin-label">New task label *</label>
          <input
            value={form.task_label}
            onChange={(e) => setForm((p) => ({ ...p, task_label: e.target.value }))}
            placeholder="e.g. Summarisation"
            className="admin-input"
            style={{ marginBottom: "0.75rem" }}
          />
        </>
      )}

      <label className="admin-label">
        Data source label *{" "}
        <span style={{ color: "#666", fontStyle: "italic", fontSize: "0.68rem", textTransform: "none" }}>
          (ID: {derivedId || "—"})
        </span>
      </label>
      <input
        value={form.data_source_label}
        onChange={(e) => setForm((p) => ({ ...p, data_source_label: e.target.value }))}
        placeholder="e.g. Social Media Posts"
        className="admin-input"
        style={{ marginBottom: "0.75rem" }}
        autoFocus
      />

      <label className="admin-label">Task description</label>
      <textarea
        value={form.task_description}
        onChange={(e) => setForm((p) => ({ ...p, task_description: e.target.value }))}
        rows={3}
        placeholder="Describe the task…"
        className="admin-input"
        style={{ resize: "vertical", marginBottom: "0.75rem" }}
      />

      <label className="admin-label">Data source description</label>
      <textarea
        value={form.data_source_description}
        onChange={(e) =>
          setForm((p) => ({ ...p, data_source_description: e.target.value }))
        }
        rows={3}
        placeholder="Describe the data source…"
        className="admin-input"
        style={{ resize: "vertical", marginBottom: "0.75rem" }}
      />

      {error && <p className="text-error">{error}</p>}
    </>
  );
};

CreateTaskForm.propTypes = {
  onCreated: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default CreateTaskForm;
