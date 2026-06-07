/** @format */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBreadcrumbs } from "../components/navigation_and_controls/BreadcrumbContext";
import { useAdmin } from "../hooks/useAdmin";
import { getAspects, getMetrics, getPaths } from "../api/config";
import AspectDetail from "../components/library/details/AspectDetail";
import MetricDetail from "../components/library/details/MetricDetail";
import PathsMenu from "../components/library/menus/PathsMenu";
import ItemList from "../components/library/menus/ItemList";
import PathDetailPanel from "../components/library/details/PathDetailPanel";
import CreateNewRun from "../components/library/edits_and_create/CreateNewRun";
import CreateMetricForm from "../components/library/edits_and_create/CreateMetricForm";
import CreateAspectForm from "../components/library/edits_and_create/CreateAspectForm";
import CreateTaskForm from "../components/library/edits_and_create/CreateTaskForm";

const MODES = ["metrics", "aspects", "paths"];
const MODE_LABELS = { aspects: "ASPECTS", metrics: "METRICS", paths: "TASKS" };
const ADD_BUTTON_LABELS = {
	aspects: "Aspect",
	metrics: "Metric",
	paths: "Task",
};

const Library = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const { setBreadcrumbs } = useBreadcrumbs();
	const { isAdmin } = useAdmin();

	useEffect(() => {
		setBreadcrumbs([{ label: "Library" }]);
		return () => setBreadcrumbs([]);
	}, [setBreadcrumbs]);

	const mode = searchParams.get("mode") ?? "aspects";
	const selectedId = searchParams.get("id") ?? null;
	const view = searchParams.get("view") ?? null;

	const [aspects, setAspects] = useState([]);
	const [metrics, setMetrics] = useState([]);
	const [paths, setPaths] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [adding, setAdding] = useState(false);

	const fetchData = useCallback(async (showLoading = false) => {
		if (showLoading) setLoading(true);
		setError(null);
		try {
			const [aspectData, metricData, pathData] = await Promise.all([
				getAspects(),
				getMetrics(),
				getPaths(),
			]);
			setAspects(aspectData);
			setMetrics(metricData);
			setPaths(pathData);
		} catch {
			setError("Failed to load library data.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData(true);
	}, [fetchData]);

	const items = mode === "aspects" ? aspects : metrics;

	const onSelectMode = (newMode) => {
		setAdding(false);
		setSearchParams({ mode: newMode });
	};
	const onSelectItem = (id) => {
		setAdding(false);
		setSearchParams({ mode, id });
	};

	const handleCreated = (created) => {
		fetchData();
		setAdding(false);
		setSearchParams({ mode, id: created.id });
	};
	const handleDeleted = () => {
		fetchData();
		setSearchParams({ mode });
	};
	const handleUpdated = () => {
		fetchData();
	};

	if (loading)
		return (
			<div className="section">
				<p>Loading…</p>
			</div>
		);
	if (error)
		return (
			<div className="section">
				<p className="has-text-danger">{error}</p>
			</div>
		);

	return (
		<div
			className="is-flex"
			style={{
				minHeight: "calc(100vh - 40px)",
			}}
		>
			{/* Left panel */}
			<div
				style={{
					width: "260px",
					flexShrink: 0,
					borderRight: "1px solid var(--bulma-border)",
					display: "flex",
					flexDirection: "column",
				}}
			>
				{/* Mode toggle */}
				<div
					style={{
						padding: "0.75rem",
						borderBottom: "1px solid var(--bulma-border)",
					}}
				>
					<div
						className="buttons has-addons"
						style={{ margin: 0 }}
					>
						{MODES.map((m) => (
							<button
								key={m}
								type="button"
								className={`button is-small  ${mode === m ? "is-link is-selected" : ""}`}
								style={{ flex: "1 1 0" }}
								onClick={() => onSelectMode(m)}
							>
								{MODE_LABELS[m]}
							</button>
						))}
					</div>
				</div>

				{/* Item list */}
				<div style={{ position: "relative", margin: "0.5rem 0.25rem" }}>
					{isAdmin && (
						<button
							type="button"
							onClick={() => {
								setAdding(true);
								setSearchParams({ mode });
							}}
							className="admin-btn-add"
							style={{
								position: "absolute",
								right: "0.25rem",
								top: "-0.25rem",
							}}
						/>
					)}

					{mode === "paths" ? (
						<PathsMenu
							paths={paths}
							selectedId={selectedId}
							onSelectPath={onSelectItem}
						/>
					) : (
						<ItemList
							items={items}
							selectedId={selectedId}
							onSelectItem={onSelectItem}
						/>
					)}
				</div>
			</div>

			{/* Right panel */}
			<div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
				{adding && mode === "metrics" && (
					<CreateMetricForm
						onCreated={handleCreated}
						onCancel={() => setAdding(false)}
					/>
				)}
				{adding && mode === "aspects" && (
					<CreateAspectForm
						onCreated={handleCreated}
						onCancel={() => setAdding(false)}
					/>
				)}
				{adding && mode === "paths" && (
					<CreateTaskForm
						onCreated={handleCreated}
						onCancel={() => setAdding(false)}
					/>
				)}

				{/* Empty state prompts */}
				{!adding && mode === "aspects" && !selectedId && (
					<p className="has-text-grey">Select an aspect from the list.</p>
				)}
				{!adding && mode === "metrics" && !selectedId && (
					<p className="has-text-grey">Select a metric from the list.</p>
				)}
				{!adding && mode === "paths" && !selectedId && (
					<p className="has-text-grey">Select a data source from the tree.</p>
				)}

				{/* Detail views */}
				{!adding && selectedId && mode === "aspects" && (
					<AspectDetail
						aspectId={selectedId}
						onNavigateToMetric={(metric) =>
							setSearchParams({ mode: "metrics", id: metric.id })
						}
						onNavigateToPath={(path) =>
							setSearchParams({ mode: "paths", id: path.path_id })
						}
						onDeleted={handleDeleted}
						onUpdated={handleUpdated}
					/>
				)}
				{!adding && selectedId && mode === "metrics" && (
					<MetricDetail
						metricId={selectedId}
						onNavigateToAspect={(aspect) =>
							setSearchParams({ mode: "aspects", id: aspect.id })
						}
						onDeleted={handleDeleted}
						onUpdated={handleUpdated}
					/>
				)}
				{!adding && selectedId && mode === "paths" && view !== "new-run" && (
					<PathDetailPanel
						pathId={selectedId}
						onCreateRun={(pathId) =>
							setSearchParams({
								mode: "paths",
								id: pathId,
								view: "new-run",
							})
						}
						onNavigateToAspect={(aspect) =>
							setSearchParams({ mode: "aspects", id: aspect.id })
						}
						onDeleted={handleDeleted}
						onUpdated={handleUpdated}
					/>
				)}
				{!adding && selectedId && mode === "paths" && view === "new-run" && (
					<CreateNewRun
						pathId={selectedId}
						onCancel={() => setSearchParams({ mode: "paths", id: selectedId })}
					/>
				)}
			</div>
		</div>
	);
};

export default Library;
