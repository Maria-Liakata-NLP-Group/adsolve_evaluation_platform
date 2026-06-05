/** @format */

import PropTypes from "prop-types";

// Shared header bar for all inline edit forms: gold title + Cancel/Save buttons.
const AdminEditHeader = ({ title, onCancel, onSave, saving, canSave }) => (
  <div className="admin-edit-header">
    <span className="admin-edit-title">{title}</span>
    <div style={{ display: "flex", gap: "0.4rem" }}>
      <button type="button" onClick={onCancel} className="admin-btn-secondary">
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !canSave}
        className="admin-btn-primary"
        style={{ opacity: saving || !canSave ? 0.5 : 1 }}
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  </div>
);

AdminEditHeader.propTypes = {
  title: PropTypes.string.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
  canSave: PropTypes.bool.isRequired,
};

export default AdminEditHeader;
