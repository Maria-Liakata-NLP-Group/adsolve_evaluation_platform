/** @format */

/**
 * Displays a description field with a fallback when none is available.
 * Used in both AspectDetail and MetricDetail.
 */
const DescriptionSection = ({ description, label = "Description" }) => (
	<div className="mb-5">
		<p
			className="is-size-7 is-uppercase has-text-grey ls-wide"
			style={{ marginBottom: "0.4rem" }}
		>
			{label}
		</p>
		<p className={description ? "" : "has-text-grey is-italic"}>
			{description || "No description available yet."}
		</p>
	</div>
);

export default DescriptionSection;
