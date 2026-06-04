/** @format */

import { useAdmin } from "../hooks/useAdmin";

// Renders Edit + Delete buttons only when the user is an admin.
// canDelete=false disables the Delete button and shows blockingMessage as a tooltip.
const AdminItemActions = ({ canDelete, blockingMessage, onEdit, onDelete }) => {
  const { isAdmin } = useAdmin();

  if (!isAdmin) return null;

  return (
    <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
      <button
        type="button"
        onClick={onEdit}
        style={{
          padding: "0.28rem 0.7rem",
          fontSize: "0.75rem",
          borderRadius: "4px",
          border: "1px solid #444",
          background: "transparent",
          color: "#ccc",
          cursor: "pointer",
        }}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={canDelete ? onDelete : undefined}
        disabled={!canDelete}
        title={!canDelete ? (blockingMessage ?? "Cannot delete: item is in use") : "Delete"}
        style={{
          padding: "0.28rem 0.7rem",
          fontSize: "0.75rem",
          borderRadius: "4px",
          border: canDelete ? "1px solid #8b2020" : "1px solid #444",
          background: canDelete ? "rgba(139,32,32,0.15)" : "transparent",
          color: canDelete ? "#e07070" : "#555",
          cursor: canDelete ? "pointer" : "not-allowed",
        }}
      >
        Delete
      </button>
    </div>
  );
};

export default AdminItemActions;
