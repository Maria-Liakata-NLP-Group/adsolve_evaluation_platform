/** @format */

import { useEffect, useState } from "react";
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
	const [addingAspect, setAddingAspect] = useState(false);
	const [addingPath, setAddingPath] = useState(false);

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
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
		};
		fetchData();
	}, []);

	const items = mode === "aspects" ? aspects : metrics;

	const onSelectMode = (newMode) => {
		setAdding(false);
		setAddingAspect(false);
		setAddingPath(false);
		setSearchParams({ mode: newMode });
	};
	const onSelectItem = (id) => {
		setAdding(false);
		setAddingAspect(false);
		setSearchParams({ mode, id });
	};
	const onSelectPath = (pathId) => {
		setAddingPath(false);
		setSearchParams({ mode: "paths", id: pathId });
	};
	const onCreateRun = (pathId) =>
		setSearchParams({ mode: "paths", id: pathId, view: "new-run" });
	const onNavigateToMetric = (metric) =>
		setSearchParams({ mode: "metrics", id: metric.id });
	const onNavigateToAspect = (aspect) =>
		setSearchParams({ mode: "aspects", id: aspect.id });

	const handleMetricCreated = (created) => {
		setMetrics((prev) => [...prev, { id: created.id, label: created.label }]);
		setAdding(false);
		setSearchParams({ mode: "metrics", id: created.id });
	};
	const handleMetricDeleted = () => {
		setMetrics((prev) => prev.filter((m) => m.id !== selectedId));
		setSearchParams({ mode: "metrics" });
	};
	const handleMetricUpdated = ({ id, label }) => {
		setMetrics((prev) => prev.map((m) => (m.id === id ? { ...m, label } : m)));
	};

	const handleAspectCreated = (created) => {
		setAspects((prev) => [...prev, { id: created.id, label: created.label }]);
		setAddingAspect(false);
		setSearchParams({ mode: "aspects", id: created.id });
	};
	const handleAspectDeleted = () => {
		setAspects((prev) => prev.filter((a) => a.id !== selectedId));
		setSearchParams({ mode: "aspects" });
	};
	const handleAspectUpdated = ({ id, label }) => {
		setAspects((prev) => prev.map((a) => (a.id === id ? { ...a, label } : a)));
	};

	const handlePathCreated = (created) => {
		setPaths((prev) => [
			...prev,
			{
				id: created.id,
				use_case_id: created.use_case_id,
				use_case_label: created.use_case_label,
				task_id: created.task_id,
				task_label: created.task_label,
				data_source_id: created.data_source_id,
				data_source_label: created.data_source_label,
			},
		]);
		setAddingPath(false);
		setSearchParams({ mode: "paths", id: created.id });
	};
	const handlePathDeleted = () => {
		setPaths((prev) => prev.filter((p) => p.id !== selectedId));
		setSearchParams({ mode: "paths" });
	};
	const handlePathUpdated = ({ id, data_source_label }) => {
		setPaths((prev) =>
			prev.map((p) => (p.id === id ? { ...p, data_source_label } : p)),
		);
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
			style={{
				display: "flex",
				height: "calc(100vh - 40px)",
				overflow: "hidden",
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
								className={`button is-small is-fullwidth ${mode === m ? "is-link is-selected" : ""}`}
								onClick={() => onSelectMode(m)}
							>
								{MODE_LABELS[m]}
							</button>
						))}
					</div>
				</div>

				{/* Item list */}
				<div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
					{mode === "paths" ? (
						<PathsMenu
							paths={paths}
							selectedId={selectedId}
							onSelectPath={onSelectPath}
						/>
					) : (
						<ItemList
							items={items}
							selectedId={selectedId}
							onSelectItem={onSelectItem}
						/>
					)}
				</div>

				{/* Admin add buttons */}
				{isAdmin && mode === "metrics" && (
					<div
						style={{
							padding: "0.6rem",
							borderTop: "1px solid var(--bulma-border)",
						}}
					>
						<button
							type="button"
							onClick={() => {
								setAdding(true);
								setSearchParams({ mode: "metrics" });
							}}
							className="admin-btn-add"
							style={{ width: "100%" }}
						>
							+ Add Metric
						</button>
					</div>
				)}
				{isAdmin && mode === "aspects" && (
					<div
						style={{
							padding: "0.6rem",
							borderTop: "1px solid var(--bulma-border)",
						}}
					>
						<button
							type="button"
							onClick={() => {
								setAddingAspect(true);
								setSearchParams({ mode: "aspects" });
							}}
							className="admin-btn-add"
							style={{ width: "100%" }}
						>
							+ Add Aspect
						</button>
					</div>
				)}
				{isAdmin && mode === "paths" && (
					<div
						style={{
							padding: "0.6rem",
							borderTop: "1px solid var(--bulma-border)",
						}}
					>
						<button
							type="button"
							onClick={() => {
								setAddingPath(true);
								setSearchParams({ mode: "paths" });
							}}
							className="admin-btn-add"
							style={{ width: "100%" }}
						>
							+ Add Task
						</button>
					</div>
				)}
			</div>

			{/* Right panel */}
			<div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
				{adding && (
					<CreateMetricForm
						onCreated={handleMetricCreated}
						onCancel={() => setAdding(false)}
					/>
				)}
				{addingAspect && (
					<CreateAspectForm
						onCreated={handleAspectCreated}
						onCancel={() => setAddingAspect(false)}
					/>
				)}
				{addingPath && (
					<CreateTaskForm
						onCreated={handlePathCreated}
						onCancel={() => setAddingPath(false)}
					/>
				)}

				{/* Empty state prompts */}
				{!adding && !addingAspect && mode === "aspects" && !selectedId && (
					<p className="has-text-grey">Select an aspect from the list.</p>
				)}
				{!adding && mode === "metrics" && !selectedId && (
					<p className="has-text-grey">Select a metric from the list.</p>
				)}
				{!adding && mode === "paths" && !selectedId && !addingPath && (
					<p className="has-text-grey">Select a data source from the tree.</p>
				)}

				{/* Detail views */}
				{!adding && !addingAspect && selectedId && mode === "aspects" && (
					<AspectDetail
						aspectId={selectedId}
						onNavigateToMetric={onNavigateToMetric}
						onNavigateToPath={onSelectPath}
						onDeleted={handleAspectDeleted}
						onUpdated={handleAspectUpdated}
					/>
				)}
				{!adding && selectedId && mode === "metrics" && (
					<MetricDetail
						metricId={selectedId}
						onNavigateToAspect={onNavigateToAspect}
						onDeleted={handleMetricDeleted}
						onUpdated={handleMetricUpdated}
					/>
				)}
				{!adding &&
					!addingPath &&
					selectedId &&
					mode === "paths" &&
					view !== "new-run" && (
						<PathDetailPanel
							pathId={selectedId}
							onCreateRun={onCreateRun}
							onNavigateToAspect={onNavigateToAspect}
							onDeleted={handlePathDeleted}
							onUpdated={handlePathUpdated}
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
