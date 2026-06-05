/** @format */
import PropTypes from "prop-types";

const AspectPopup = ({ isOpen, title, onClose, children }) => {
	if (!isOpen) return null;

	return (
		<div className={`modal ${isOpen ? "is-active" : ""}`}>
			<div
				className="modal-background"
				onClick={onClose}
			/>
			<div className="modal-card">
				<header className="modal-card-head">
					<p className="modal-card-title">{title}</p>
					<button
						type="button"
						className="delete"
						aria-label="close"
						onClick={onClose}
					/>
				</header>

				<section className="modal-card-body">{children}</section>

				<footer className="modal-card-foot is-justify-content-flex-end">
					<button
						type="button"
						className="button"
						onClick={onClose}
					>
						Close
					</button>
				</footer>
			</div>
		</div>
	);
};

export default AspectPopup;

// Props validation
AspectPopup.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	title: PropTypes.string.isRequired,
	onClose: PropTypes.func.isRequired,
	children: PropTypes.node,
};
