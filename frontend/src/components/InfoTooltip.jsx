/** @format */
import PropTypes from "prop-types";

const NO_DESCRIPTION = "No description available yet.";

// Inline styles on the icon bypass cascade issues from parent containers
// (e.g. text-transform:uppercase from .section-label turning "i" into "I").
const iconStyle = {
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	width: "1.1rem",
	height: "1.1rem",
	minWidth: "1.1rem",
	borderRadius: "50%",
	border: "1.5px solid var(--brand-gold)",
	color: "var(--brand-gold-text)",
	fontSize: "0.65rem",
	fontFamily: '"Raleway", sans-serif',
	fontWeight: 700,
	fontStyle: "italic",
	textTransform: "none",
	letterSpacing: 0,
	lineHeight: 1,
	userSelect: "none",
	flexShrink: 0,
};

const InfoTooltip = ({ text, onClick }) => (
	<span
		className="info-tooltip"
		aria-label={text ?? NO_DESCRIPTION}
	>
		<span
			className="info-tooltip__icon"
			style={onClick ? { ...iconStyle, cursor: "pointer" } : iconStyle}
			onClick={onClick}
			role={onClick ? "button" : undefined}
			tabIndex={onClick ? 0 : undefined}
		>
			i
		</span>
		<span className="info-tooltip__body">
			{text ?? NO_DESCRIPTION}
			{onClick && (
				<span
					style={{
						display: "block",
						marginTop: "0.5rem",
						fontStyle: "italic",
						color: "var(--bulma-grey)",
					}}
				>
					Click icon to view details!
				</span>
			)}
		</span>
	</span>
);

export default InfoTooltip;

InfoTooltip.propTypes = {
	text: PropTypes.string,
	onClick: PropTypes.func || null,
};
