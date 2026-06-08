/** @format */

import { useMemo, useState } from "react";
import AspectPopup from "./aspectPopup";

// Render helpers for popup body content
const renderExamplesContent = (data) => {
	if (!data) return <p>No examples available yet.</p>;
	return (
		<div className="content">
			{data.original_posts?.length > 0 && (
				<>
					<h4>Original posts</h4>
					<ul>
						{data.original_posts.map((post, index) => (
							<li key={`${post}-${index}`}>{post}</li>
						))}
					</ul>
				</>
			)}
			{data.good_summary && (
				<>
					<h4>Good summary</h4>
					<p>{data.good_summary}</p>
				</>
			)}
			{data.why_good && (
				<>
					<h4>Why this is good</h4>
					<p>{data.why_good}</p>
				</>
			)}
			{data.bad_summary && (
				<>
					<h4>Bad summary</h4>
					<p>{data.bad_summary}</p>
				</>
			)}
			{data.why_bad && (
				<>
					<h4>Why this is bad</h4>
					<p>{data.why_bad}</p>
				</>
			)}
		</div>
	);
};

const renderStakeholderRequirementsContent = (data) => {
	if (!data?.items?.length)
		return <p>No stakeholder requirements available yet.</p>;
	return (
		<div className="content">
			<ul>
				{data.items.map((item, index) => (
					<li key={`${item}-${index}`}>{item}</li>
				))}
			</ul>
		</div>
	);
};

const renderMetricsContent = (metrics) => {
	if (!metrics?.length)
		return <p>No metrics available for this configuration yet.</p>;
	return (
		<div>
			{metrics.map((metric) => (
				<div
					key={metric.id}
					className="box"
				>
					<h4 className="title is-6 mb-2">{metric.label}</h4>
					{metric.tags?.length > 0 && (
						<div className="tags mb-3">
							{metric.tags.map((tag) => (
								<span
									key={tag}
									className="tag"
								>
									{tag}
								</span>
							))}
						</div>
					)}
					<p>{metric.description ?? "No description available."}</p>
				</div>
			))}
		</div>
	);
};

// Card with a fixed footer (popup buttons) and a flexible head via children.
// Each card manages its own popup state. onClick navigates to the related path.
const PathAspectCard = ({
	children,
	label,
	examples,
	stakeholderRequirements,
	metrics,
	onClick,
}) => {
	const [activePopup, setActivePopup] = useState(null);

	const popupTitle = useMemo(() => {
		if (!activePopup || !label) return "";
		if (activePopup === "examples") return `${label} — Examples`;
		if (activePopup === "stakeholder_requirements")
			return `${label} — Stakeholder Requirements`;
		if (activePopup === "metrics") return `${label} — Metrics`;
		return label;
	}, [activePopup, label]);

	const popupContent = useMemo(() => {
		if (!activePopup) return null;
		if (activePopup === "examples") return renderExamplesContent(examples);
		if (activePopup === "stakeholder_requirements")
			return renderStakeholderRequirementsContent(stakeholderRequirements);
		if (activePopup === "metrics") return renderMetricsContent(metrics);
		return null;
	}, [activePopup, examples, stakeholderRequirements, metrics]);

	return (
		<>
			<div
				className="card"
				onClick={onClick}
				style={onClick ? { cursor: "pointer" } : undefined}
			>
				<div
					className="card-content is-flex is-flex-direction-column is-align-items-space-between"
					style={{ height: "100%" }}
				>
					<div className="is-flex-grow-1">{children}</div>

					<div className="buttons mt-3">
						<button
							type="button"
							className="button is-small is-info is-light"
							onClick={(e) => {
								e.stopPropagation();
								setActivePopup("examples");
							}}
						>
							Examples
						</button>
						<button
							type="button"
							className="button is-small is-warning is-light"
							onClick={(e) => {
								e.stopPropagation();
								setActivePopup("stakeholder_requirements");
							}}
						>
							Stakeholder Requirements
						</button>
						<button
							type="button"
							className="button is-small is-success is-light"
							onClick={(e) => {
								e.stopPropagation();
								setActivePopup("metrics");
							}}
						>
							Metrics
						</button>
					</div>
				</div>
			</div>

			<AspectPopup
				isOpen={!!activePopup}
				title={popupTitle}
				onClose={() => setActivePopup(null)}
			>
				{popupContent}
			</AspectPopup>
		</>
	);
};

export default PathAspectCard;
