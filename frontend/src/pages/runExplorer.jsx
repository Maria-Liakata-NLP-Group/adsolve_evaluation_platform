/** @format */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBreadcrumbs } from "../components/navigation_and_controls/BreadcrumbContext";
import RunCard from "../components/modals_and_cards/RunCard";
import { getRuns } from "../api/runs";

const RunExplorer = () => {
	const navigate = useNavigate();
	const { setBreadcrumbs } = useBreadcrumbs();
	const [runs, setRuns] = useState([]);
	const [error, setError] = useState(null);
	const [selectedUseCaseId, setSelectedUseCaseId] = useState("");
	const [selectedTaskLabel, setSelectedTaskLabel] = useState("");
	const [expandedId, setExpandedId] = useState(null);
	const [lockedHeights, setLockedHeights] = useState({});
	const columnRefs = useRef({});

	// Lock all non-expanding columns to their current pixel height so they
	// don't grow when a sibling card expands. Release locks on collapse.
	const handleToggleDetails = (runId) => {
		if (expandedId === runId) {
			setExpandedId(null);
			setLockedHeights({});
		} else {
			const heights = {};
			for (const [id, el] of Object.entries(columnRefs.current)) {
				if (el && String(id) !== String(runId)) {
					heights[id] = el.getBoundingClientRect().height;
				}
			}
			setLockedHeights(heights);
			setExpandedId(runId);
		}
	};

	useEffect(() => {
		setBreadcrumbs([{ label: "Runs" }]);
		getRuns()
			.then(setRuns)
			.catch((err) => setError(err.message));
		return () => setBreadcrumbs([]);
	}, [setBreadcrumbs]);

	// Derive unique use cases from run data, preserving first-seen order.
	const useCases = useMemo(() => {
		const seen = new Map();
		runs.forEach((r) => {
			if (r.use_case_id && !seen.has(r.use_case_id)) {
				seen.set(r.use_case_id, r.use_case_label ?? r.use_case_id);
			}
		});
		return [...seen.entries()].map(([id, label]) => ({ id, label }));
	}, [runs]);

	// Derive unique task labels for the selected use case.
	const tasks = useMemo(() => {
		const scope = selectedUseCaseId
			? runs.filter((r) => r.use_case_id === selectedUseCaseId)
			: runs;
		return [...new Set(scope.map((r) => r.task_label).filter(Boolean))];
	}, [runs, selectedUseCaseId]);

	// Reset task filter when use case changes.
	const handleUseCaseChange = (id) => {
		setSelectedUseCaseId(id);
		setSelectedTaskLabel("");
	};

	const filteredRuns = runs.filter((r) => {
		if (selectedUseCaseId && r.use_case_id !== selectedUseCaseId) return false;
		if (selectedTaskLabel && r.task_label !== selectedTaskLabel) return false;
		return true;
	});

	if (error) return <div>Error: {error}</div>;

	return (
		<div>
			<h1
				className="title is-4"
				style={{ margin: "1.5rem 0 0.25rem" }}
			>
				Evaluation Runs
			</h1>
			<p className="subtitle is-6 mb-5">
				Browse and filter completed evaluation runs
			</p>

			{/* Filters */}
			<div className="is-flex is-flex-wrap-wrap gap-4 mb-6">
				<div className="field mb-0">
					<div className="control">
						<div className="select">
							<select
								value={selectedUseCaseId}
								onChange={(e) => handleUseCaseChange(e.target.value)}
							>
								<option value="">All use cases</option>
								{useCases.map((uc) => (
									<option
										key={uc.id}
										value={uc.id}
									>
										{uc.label}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>

				<div className="field mb-0">
					<div className="control">
						<div className="select">
							<select
								value={selectedTaskLabel}
								onChange={(e) => setSelectedTaskLabel(e.target.value)}
								disabled={tasks.length === 0}
							>
								<option value="">All tasks</option>
								{tasks.map((t) => (
									<option
										key={t}
										value={t}
									>
										{t}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>
			</div>

			{/* Run grid */}
			<div className="columns is-multiline">
				{filteredRuns.map((run) => (
					<div
						key={run.id}
						ref={(el) => { columnRefs.current[run.id] = el; }}
						className="column is-4 is-flex"
						style={lockedHeights[run.id] ? { height: `${lockedHeights[run.id]}px` } : undefined}
					>
						<RunCard
							run={run}
							showDetails={expandedId === run.id}
							onToggleDetails={() => handleToggleDetails(run.id)}
							onNavigate={() =>
								navigate(`/runs/${run.use_case_id}/${run.path_id}/${run.id}`)
							}
						/>
					</div>
				))}
				{filteredRuns.length === 0 && (
					<div className="column">
						<p className="has-text-grey is-italic">
							No runs match the selected filters.
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default RunExplorer;
