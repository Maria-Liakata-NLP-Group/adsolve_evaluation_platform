/** @format */

import PropTypes from "prop-types";

// Group metrics by their aspect, preserving aspect order of first appearance.
// Metrics with no aspect fall into a trailing "Other" group.
const groupByAspect = (metrics) => {
	const groups = new Map();
	for (const m of metrics) {
		const key = m.aspect_id ?? "__other";
		if (!groups.has(key)) {
			groups.set(key, {
				label: m.aspect_label ?? "Other",
				definition: m.aspect_definition ?? null,
				metrics: [],
			});
		}
		groups.get(key).metrics.push(m);
	}
	return [...groups.values()];
};

const SectionLabel = ({ children }) => (
	<span className="is-size-7 has-text-dark has-text-weight-bold mr-2">
		{children}
	</span>
);

const TagList = ({ items }) => (
	<div className="tags mb-0">
		{items.map((item) => (
			<span
				key={item}
				className="tag is-primary"
			>
				{item}
			</span>
		))}
	</div>
);

const RunCard = ({ run, onNavigate, showDetails, onToggleDetails }) => {
	const aspectGroups = groupByAspect(run.metrics ?? []);

	const toggleDetails = (e) => {
		e.stopPropagation();
		onToggleDetails();
	};

	return (
		<div
			className="card mb-5 is-flex is-flex-direction-column"
			style={{ cursor: onNavigate ? "pointer" : "default" }}
			onClick={onNavigate}
		>
			<div className="card-content is-flex-grow-1">
				{/* Header */}
				<div className="mb-4">
					<h3
						className="title is-5"
						style={{ marginBottom: "0.2rem" }}
					>
						{run.title}
					</h3>
					<p className="is-size-7 has-text-grey">
						{[run.use_case_label, run.task_label, run.data_source_label]
							.filter(Boolean)
							.join(" · ")}
						{run.id != null && ` (Run ID: ${run.id})`}
					</p>
				</div>

				{/* Descriptions — only rendered when values are present */}
				{run.task_description && (
					<div className="mb-3">
						<p className="is-size-7">
							<SectionLabel>Task Description</SectionLabel>
							{run.task_description}
						</p>
					</div>
				)}
				{run.data_source_description && (
					<div className="mb-3">
						<p className="is-size-7">
							<SectionLabel>Data Source Description</SectionLabel>
							{run.data_source_description}
						</p>
					</div>
				)}
				{run.notes && (
					<div className="mb-3">
						<p className="is-size-7">
							<SectionLabel>Notes</SectionLabel>
							{run.notes}
						</p>
					</div>
				)}

				{/* Collapsible details */}
				{showDetails && (
					<>
						<hr className="my-3" />

						<div className="mb-3">
							<p className="is-flex">
								<SectionLabel>Datasets</SectionLabel>
								<TagList items={(run.datasets ?? []).map((d) => d.name)} />
							</p>
						</div>

						<div className="mb-3">
							<p className="is-flex">
								<SectionLabel>Models</SectionLabel>
								<TagList items={(run.models ?? []).map((m) => m.name)} />
							</p>
						</div>

						<div>
							<p style={{ marginBottom: "0.4rem" }}>
								<SectionLabel>Aspects &amp; Metrics</SectionLabel>
							</p>
							{aspectGroups.length === 0 ? (
								<p className="is-size-7 has-text-grey is-italic">
									No aspects or metrics linked.
								</p>
							) : (
								<div className="is-flex is-flex-direction-column gap-2">
									{aspectGroups.map((group) => (
										<div
											key={group.label}
											className="is-flex"
										>
											<span
												className="has-text-weight-semibold is-size-7 mr-2"
												style={{ whiteSpace: "nowrap" }}
											>
												{group.label}
											</span>
											<div className="tags mb-0">
												{group.metrics.map((m) => (
													<span
														key={m.metric_id}
														className="tag is-primary"
													>
														{m.display_label}
													</span>
												))}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</>
				)}
			</div>

			<div className="card-footer">
				<button
					type="button"
					className="card-footer-item button is-ghost is-size-7"
					onClick={toggleDetails}
				>
					{showDetails ? "Hide details" : "Show details"}
				</button>
			</div>
		</div>
	);
};

SectionLabel.propTypes = { children: PropTypes.node.isRequired };
TagList.propTypes = { items: PropTypes.arrayOf(PropTypes.string).isRequired };
RunCard.propTypes = {
	showDetails: PropTypes.bool.isRequired,
	onToggleDetails: PropTypes.func.isRequired,
	run: PropTypes.shape({
		title: PropTypes.string,
		use_case_label: PropTypes.string,
		task_label: PropTypes.string,
		task_description: PropTypes.string,
		data_source_label: PropTypes.string,
		data_source_description: PropTypes.string,
		notes: PropTypes.string,
		datasets: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string })),
		models: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string })),
		metrics: PropTypes.arrayOf(
			PropTypes.shape({
				metric_id: PropTypes.string,
				display_label: PropTypes.string,
				aspect_id: PropTypes.string,
				aspect_label: PropTypes.string,
				aspect_definition: PropTypes.string,
			}),
		),
	}).isRequired,
	onNavigate: PropTypes.func,
};

export default RunCard;
