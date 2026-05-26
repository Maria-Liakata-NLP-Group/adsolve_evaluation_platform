/** @format */

const NO_DESCRIPTION = "No description available yet.";

const InfoTooltip = ({ text }) => (
  <span className="info-tooltip" aria-label={text ?? NO_DESCRIPTION}>
    <span className="info-tooltip__icon">i</span>
    <span className="info-tooltip__body">{text ?? NO_DESCRIPTION}</span>
  </span>
);

export default InfoTooltip;
