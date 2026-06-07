/** @format */

import PropTypes from "prop-types";
import { useState } from "react";
import { updatePath } from "../../../api/config";
import { useAdmin } from "../../../hooks/useAdmin";
import AdminEditHeader from "../../navigation_and_controls/AdminEditHeader";

const PathDetailEdit = ({ path, onSaved, onCancel }) => {
  const { token } = useAdmin();
  const [form, setForm] = useState({
    data_source_label: path.data_source_label,
    data_source_description: path.data_source_description ?? "",
    task_description: path.task_description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updatePath(path.id, {
        data_source_label: form.data_source_label.trim(),
        data_source_description: form.data_source_description.trim() || null,
        task_description: form.task_description.trim() || null,
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
        title="Editing task"
        onCancel={onCancel}
        onSave={handleSave}
        saving={saving}
        canSave={!!form.data_source_label.trim()}
      />

      <label className="admin-label">Data source label *</label>
      <input
        value={form.data_source_label}
        onChange={(e) => setForm((p) => ({ ...p, data_source_label: e.target.value }))}
        className="admin-input mb-3"
        autoFocus
      />

      <label className="admin-label">Task description</label>
      <textarea
        value={form.task_description}
        onChange={(e) => setForm((p) => ({ ...p, task_description: e.target.value }))}
        rows={3}
        className="admin-input mb-3"
        style={{ resize: "vertical" }}
      />

      <label className="admin-label">Data source description</label>
      <textarea
        value={form.data_source_description}
        onChange={(e) => setForm((p) => ({ ...p, data_source_description: e.target.value }))}
        rows={3}
        className="admin-input mb-3"
        style={{ resize: "vertical" }}
      />

      {saveError && <p className="text-error">{saveError}</p>}
    </>
  );
};

PathDetailEdit.propTypes = {
  path: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    data_source_label: PropTypes.string.isRequired,
    data_source_description: PropTypes.string,
    task_description: PropTypes.string,
  }).isRequired,
  onSaved: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default PathDetailEdit;
