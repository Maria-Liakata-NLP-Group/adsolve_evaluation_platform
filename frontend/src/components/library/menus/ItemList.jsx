/** @format */

import PropTypes from "prop-types";

const ItemList = ({ items, selectedId, onSelectItem }) =>
	items.map((item) => (
		<button
			key={item.id}
			type="button"
			onClick={() => onSelectItem(item.id)}
			style={{
				display: "block",
				width: "100%",
				textAlign: "left",
				padding: "0.45rem 0.75rem",
				borderRadius: "6px",
				border: "none",
				background:
					selectedId === item.id ? "var(--bulma-link-light)" : "transparent",
				color: selectedId === item.id ? "var(--bulma-link)" : "inherit",
				fontWeight: selectedId === item.id ? 600 : 400,
				fontSize: "0.85rem",
				cursor: "pointer",
			}}
		>
			{item.label}
		</button>
	));

ItemList.propTypes = {
	items: PropTypes.arrayOf(
		PropTypes.shape({
			id: PropTypes.string.isRequired,
			label: PropTypes.string.isRequired,
		}),
	).isRequired,
	selectedId: PropTypes.string,
	onSelectItem: PropTypes.func.isRequired,
};

ItemList.defaultProps = {
	selectedId: null,
};

export default ItemList;
