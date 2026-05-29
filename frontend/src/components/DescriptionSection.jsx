/** @format */

/**
 * Displays a description field with a fallback when none is available.
 * Used in both AspectDetail and MetricDetail.
 */
const DescriptionSection = ({ description, label = "Description" }) => (
	<div style={{ marginBottom: "1.5rem" }}>
		<p
			className="is-size-7 is-uppercase has-text-grey"
			style={{ letterSpacing: "0.1em", marginBottom: "0.4rem" }}
		>
			{label}
		</p>
		<p className={description ? "" : "has-text-grey is-italic"}>
			{description || "No description available yet."}
		</p>
	</div>
);

export default DescriptionSection;
