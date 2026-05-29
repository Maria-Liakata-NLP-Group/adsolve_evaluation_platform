/** @format */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAspects, getMetrics, getPaths } from "../api/config";
import AspectDetail from "../components/AspectDetail";
import MetricDetail from "../components/MetricDetail";
import PathsMenu from "../components/PathsMenu";
import PathDetailPanel from "../components/PathDetailPanel";
import CreateNewRun from "../components/CreateNewRun";

const MODES = ["aspects", "metrics", "paths"];

const Library = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const mode = searchParams.get("mode") ?? "aspects";
	const selectedId = searchParams.get("id") ?? null;

	const [aspects, setAspects] = useState([]);
	const [metrics, setMetrics] = useState([]);
	const [paths, setPaths] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Load all list data on mount
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

	const view = searchParams.get("view") ?? null;

	const onSelectMode = (newMode) => setSearchParams({ mode: newMode });
	const onSelectItem = (id) => setSearchParams({ mode, id });
	const onSelectPath = (pathId) => setSearchParams({ mode: "paths", id: pathId });
	const onCreateRun = (pathId) => setSearchParams({ mode: "paths", id: pathId, view: "new-run" });
	const onNavigateToMetric = (metric) => setSearchParams({ mode: "metrics", id: metric.id });
	const onNavigateToAspect = (aspect) => setSearchParams({ mode: "aspects", id: aspect.id });

	if (loading) return <div className="section"><p>Loading…</p></div>;
	if (error) return <div className="section"><p className="has-text-danger">{error}</p></div>;

	return (
		<div style={{ display: "flex", height: "calc(100vh - 40px)", overflow: "hidden" }}>

			{/* Left panel */}
			<div style={{
				width: "260px",
				flexShrink: 0,
				borderRight: "1px solid var(--bulma-border)",
				display: "flex",
				flexDirection: "column",
			}}>
				{/* Mode toggle */}
				<div style={{ padding: "0.75rem", borderBottom: "1px solid var(--bulma-border)" }}>
					<div className="buttons has-addons" style={{ margin: 0 }}>
						{MODES.map((m) => (
							<button
								key={m}
								type="button"
								className={`button is-small is-fullwidth ${mode === m ? "is-link is-selected" : ""}`}
								onClick={() => onSelectMode(m)}
							>
								{m.toUpperCase()}
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
						items.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => onSelectItem(item.id)}
								style={{
									display: "block",
									width: "100%",
									textAlign: "left",
									padding: "0.45rem 0.75rem",
									borderRadius: "6px",
									border: "none",
									background: selectedId === item.id ? "var(--bulma-link-light)" : "transparent",
									color: selectedId === item.id ? "var(--bulma-link)" : "inherit",
									fontWeight: selectedId === item.id ? 600 : 400,
									fontSize: "0.85rem",
									cursor: "pointer",
								}}
							>
								{item.label}
							</button>
						))
					)}
				</div>
			</div>

			{/* Detail panel */}
			<div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
				{mode === "aspects" && !selectedId && (
					<p className="has-text-grey">Select an aspect from the list.</p>
				)}
				{mode === "metrics" && !selectedId && (
					<p className="has-text-grey">Select a metric from the list.</p>
				)}
				{mode === "paths" && !selectedId && (
					<p className="has-text-grey">Select a data source from the tree.</p>
				)}
				{selectedId && mode === "aspects" && (
					<AspectDetail aspectId={selectedId} onNavigateToMetric={onNavigateToMetric} />
				)}
				{selectedId && mode === "metrics" && (
					<MetricDetail metricId={selectedId} onNavigateToAspect={onNavigateToAspect} />
				)}
				{selectedId && mode === "paths" && view !== "new-run" && (
					<PathDetailPanel pathId={selectedId} onCreateRun={onCreateRun} />
				)}
				{selectedId && mode === "paths" && view === "new-run" && (
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
