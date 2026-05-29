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
	<span
		className="is-size-7 has-text-dark has-text-weight-bold"
		style={{ marginRight: "0.5rem" }}
	>
		{children}
	</span>
);

const TagList = ({ items }) => (
	<div className="tags" style={{ marginBottom: 0 }}>
		{items.map((item) => (
			<span key={item} className="tag is-primary">
				{item}
			</span>
		))}
	</div>
);

const RunCard = ({ run, onNavigate }) => {
	const aspectGroups = groupByAspect(run.metrics ?? []);

	return (
		<div
			className="card"
			style={{ marginBottom: "1.5rem", cursor: onNavigate ? "pointer" : "default" }}
			onClick={onNavigate}
		>
			<div className="card-content">

				{/* Header */}
				<div style={{ marginBottom: "1.25rem" }}>
					<h3 className="title is-5" style={{ marginBottom: "0.2rem" }}>
						{run.title}
					</h3>
					<p className="is-size-7 has-text-grey">
						{[run.use_case_label, run.task_label, run.data_source_label]
							.filter(Boolean)
							.join(" · ")}
					</p>
				</div>

				{/* Descriptions — only rendered when values are present */}
				{run.task_description && (
					<div style={{ marginBottom: "1rem" }}>
						<p className="is-size-7">
							<SectionLabel>Task Description</SectionLabel>
							{run.task_description}
						</p>
					</div>
				)}
				{run.data_source_description && (
					<div style={{ marginBottom: "1rem" }}>
						<p className="is-size-7">
							<SectionLabel>Data Source Description</SectionLabel>
							{run.data_source_description}
						</p>
					</div>
				)}
				{run.notes && (
					<div style={{ marginBottom: "1rem" }}>
						<p className="is-size-7">
							<SectionLabel>Notes</SectionLabel>
							{run.notes}
						</p>
					</div>
				)}

				<hr style={{ margin: "1rem 0" }} />

				{/* Datasets, Models (left) and Aspects & Metrics (right) */}
				<div className="columns is-mobile">
					<div className="column">
						<p className="is-flex" style={{ marginBottom: "0.5rem" }}>
							<SectionLabel>Datasets</SectionLabel>
							<TagList items={(run.datasets ?? []).map((d) => d.name)} />
						</p>
						<p className="is-flex">
							<SectionLabel>Models</SectionLabel>
							<TagList items={(run.models ?? []).map((m) => m.name)} />
						</p>
					</div>
					<div className="column">
						<SectionLabel>Aspects &amp; Metrics</SectionLabel>
						{aspectGroups.length === 0 ? (
							<p className="is-size-7 has-text-grey is-italic">No aspects or metrics linked.</p>
						) : (
							<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
								{aspectGroups.map((group) => (
									<div key={group.label} className="is-flex">
										<span
											className="has-text-weight-semibold is-size-7"
											style={{ marginRight: "0.5rem" }}
										>
											{group.label}
										</span>
										<div className="tags" style={{ marginBottom: 0 }}>
											{group.metrics.map((m) => (
												<span key={m.metric_id} className="tag is-primary">
													{m.display_label}
												</span>
											))}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

			</div>

		</div>
	);
};

SectionLabel.propTypes = { children: PropTypes.node.isRequired };
TagList.propTypes = { items: PropTypes.arrayOf(PropTypes.string).isRequired };
RunCard.propTypes = {
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
		metrics: PropTypes.arrayOf(PropTypes.shape({
			metric_id: PropTypes.string,
			display_label: PropTypes.string,
			aspect_id: PropTypes.string,
			aspect_label: PropTypes.string,
			aspect_definition: PropTypes.string,
		})),
	}).isRequired,
	onNavigate: PropTypes.func,
};

export default RunCard;
