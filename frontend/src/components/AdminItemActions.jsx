/** @format */

import PropTypes from "prop-types";
import { useAdmin } from "../hooks/useAdmin";

// Renders Edit + Delete buttons only when the user is an admin.
// canDelete=false disables the Delete button and shows blockingMessage as a tooltip.
const AdminItemActions = ({ canDelete, blockingMessage, onEdit, onDelete, deleteLabel = "Delete" }) => {
	const { isAdmin } = useAdmin();

	if (!isAdmin) return null;

	return (
		<div className="admin-item-actions">
			<button type="button" onClick={onEdit} className="admin-btn-edit">
				Edit
			</button>
			<button
				type="button"
				onClick={canDelete ? onDelete : undefined}
				disabled={!canDelete}
				title={!canDelete ? (blockingMessage ?? "Cannot delete: item is in use") : deleteLabel}
				className={canDelete ? "admin-btn-delete" : "admin-btn-delete--disabled"}
			>
				{deleteLabel}
			</button>
		</div>
	);
};

AdminItemActions.propTypes = {
	canDelete: PropTypes.bool.isRequired,
	blockingMessage: PropTypes.string,
	onEdit: PropTypes.func.isRequired,
	onDelete: PropTypes.func.isRequired,
	deleteLabel: PropTypes.string,
};

export default AdminItemActions;
