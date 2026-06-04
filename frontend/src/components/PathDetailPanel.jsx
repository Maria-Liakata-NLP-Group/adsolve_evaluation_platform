/** @format */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPath } from "../api/config";
import { getRunsByPath } from "../api/runs";
import DescriptionSection from "./DescriptionSection";
import PathAspectCard from "./PathAspectCard";
import RunCard from "./RunCard";

const PathDetailPanel = ({ pathId, onCreateRun, onNavigateToAspect }) => {
	const navigate = useNavigate();
	const [detail, setDetail] = useState(null);
	const [runs, setRuns] = useState([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!pathId) return;
		const fetchAll = async () => {
			setLoading(true);
			try {
				const [pathData, runData] = await Promise.all([
					getPath(pathId),
					getRunsByPath(pathId),
				]);
				setDetail(pathData);
				setRuns(runData);
			} catch {
				setDetail(null);
				setRuns([]);
			} finally {
				setLoading(false);
			}
		};
		fetchAll();
	}, [pathId]);

	if (loading) return <p className="has-text-grey">Loading…</p>;
	if (!detail) return null;

	return (
		<>
			{/* Path heading */}
			<div style={{ marginBottom: "1.5rem" }}>
				<p
					className="is-size-7 has-text-grey"
					style={{ marginBottom: "0.2rem" }}
				>
					<span
						className="is-uppercase"
						style={{ letterSpacing: "0.08em" }}
					>
						Use Case
					</span>
					{" · "}
					{detail.use_case_label}
				</p>
				<p
					className="is-size-7 has-text-grey"
					style={{ marginBottom: "0.2rem" }}
				>
					<span
						className="is-uppercase"
						style={{ letterSpacing: "0.08em" }}
					>
						Task
					</span>
					{" · "}
					{detail.task_label}
				</p>
				<h2
					className="title is-4"
					style={{ marginTop: "0.5rem", marginBottom: 0 }}
				>
					{detail.data_source_label}
				</h2>
			</div>

			<DescriptionSection
				label="Task Description"
				description={detail.task_description}
			/>
			<DescriptionSection
				label="Data Source Description"
				description={detail.data_source_description}
			/>

			{/* Recommended aspects */}
			<p
				className="is-size-7 is-uppercase has-text-grey"
				style={{ letterSpacing: "0.1em", marginBottom: "0.75rem" }}
			>
				Recommended Aspects
			</p>
			{detail.aspects.length === 0 ? (
				<p
					className="has-text-grey is-italic"
					style={{ marginBottom: "2rem" }}
				>
					No aspects defined for this path yet.
				</p>
			) : (
				<div
					className="columns is-multiline"
					style={{ marginBottom: "2rem" }}
				>
					{detail.aspects.map((aspect) => (
						<div
							key={aspect.id}
							className="column is-6"
						>
							<PathAspectCard
								label={aspect.label}
								examples={aspect.examples}
								stakeholderRequirements={aspect.stakeholder_requirements}
								metrics={aspect.metrics}
								onClick={onNavigateToAspect ? () => onNavigateToAspect({ id: aspect.id }) : undefined}
							>
								<p className="has-text-weight-semibold mb-2">{aspect.label}</p>
								{aspect.definition && (
									<p className="is-size-7">{aspect.definition}</p>
								)}
							</PathAspectCard>
						</div>
					))}
				</div>
			)}

			{/* Completed evaluation runs */}
			<p
				className="is-size-7 is-uppercase has-text-grey"
				style={{ letterSpacing: "0.1em", marginBottom: "0.75rem" }}
			>
				Completed Evaluation Runs
			</p>
			<p className="is-size-7 has-text-grey" style={{ marginBottom: "1rem" }}>
				Click one of the evaluation run cards to add a dataset or model to an existing run, or{" "}
				<button
					type="button"
					className="button is-ghost is-small"
					style={{ padding: 0, height: "auto", verticalAlign: "baseline", color: "var(--bulma-link)" }}
					onClick={() => onCreateRun?.(pathId)}
				>
					create a new run
				</button>{" "}
				for this evaluation path.
			</p>
			{runs.length === 0 ? (
				<p className="has-text-grey is-italic">
					No completed runs for this path yet.
				</p>
			) : (
				<div className="columns is-multiline">
					{runs.map((run) => (
						<div
							key={run.id}
							className="column is-6"
						>
							<RunCard
								run={{
									...run,
									task_description: null,
									data_source_description: null,
								}}
								onNavigate={() =>
									navigate(`/use-cases/${detail.use_case_id}/${run.path_id}/${run.id}`)
								}
							/>
						</div>
					))}
				</div>
			)}
		</>
	);
};

export default PathDetailPanel;
