/** @format */

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

const InfoTooltip = ({ text }) => (
  <span className="info-tooltip" aria-label={text ?? NO_DESCRIPTION}>
    <span className="info-tooltip__icon" style={iconStyle}>i</span>
    <span className="info-tooltip__body">{text ?? NO_DESCRIPTION}</span>
  </span>
);

export default InfoTooltip;
