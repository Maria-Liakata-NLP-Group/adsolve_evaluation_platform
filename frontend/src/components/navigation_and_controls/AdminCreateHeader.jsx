/** @format */

import PropTypes from "prop-types";

// Shared header bar for all inline create forms: gold title + Cancel/Create buttons.
const AdminCreateHeader = ({ title, onCancel, onCreate, creating, canCreate }) => (
  <div className="admin-edit-header">
    <span className="admin-edit-title">{title}</span>
    <div className="admin-button-group">
      <button type="button" onClick={onCancel} className="admin-btn-secondary">
        Cancel
      </button>
      <button
        type="button"
        onClick={onCreate}
        disabled={creating || !canCreate}
        className="admin-btn-primary"
        style={{ opacity: creating || !canCreate ? 0.5 : 1 }}
      >
        {creating ? "Creating…" : "Create"}
      </button>
    </div>
  </div>
);

AdminCreateHeader.propTypes = {
  title: PropTypes.string.isRequired,
  onCancel: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  creating: PropTypes.bool.isRequired,
  canCreate: PropTypes.bool.isRequired,
};

export default AdminCreateHeader;
