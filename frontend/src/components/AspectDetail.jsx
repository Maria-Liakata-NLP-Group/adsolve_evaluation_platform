/** @format */

import { useEffect, useState } from "react";
import { getAspect, getAspectPaths } from "../api/config";
import AssociatedItems from "./AssociatedItems";
import DescriptionSection from "./DescriptionSection";
import PathAspectCard from "./PathAspectCard";

const AspectDetail = ({ aspectId, onNavigateToMetric }) => {
	const [detail, setDetail] = useState(null);
	const [paths, setPaths] = useState([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!aspectId) return;
		const fetchAll = async () => {
			setLoading(true);
			try {
				const [aspectData, pathData] = await Promise.all([
					getAspect(aspectId),
					getAspectPaths(aspectId),
				]);
				setDetail(aspectData);
				setPaths(pathData);
			} catch {
				setDetail(null);
				setPaths([]);
			} finally {
				setLoading(false);
			}
		};
		fetchAll();
	}, [aspectId]);

	if (!detail && !loading) return null;

	return (
		<>
			<p
				className="is-size-7 has-text-grey is-uppercase"
				style={{ letterSpacing: "0.08em", marginBottom: "0.25rem" }}
			>
				Aspect
			</p>
			<h2 className="title is-4" style={{ marginBottom: "1.5rem" }}>
				{detail?.label}
			</h2>
			<DescriptionSection description={detail?.description} />
			<AssociatedItems
				label="Associated Metrics"
				items={detail?.metrics ?? []}
				loading={loading}
				onItemClick={onNavigateToMetric}
			/>

			{/* Used in Paths section */}
			<div style={{ marginTop: "2rem" }}>
				<p
					className="is-size-7 is-uppercase has-text-grey"
					style={{ letterSpacing: "0.1em", marginBottom: "0.75rem" }}
				>
					Used in Paths
				</p>
				{loading ? (
					<p className="has-text-grey is-italic">Loading…</p>
				) : paths.length === 0 ? (
					<p className="has-text-grey is-italic">Not used in any paths yet.</p>
				) : (
					<div className="columns is-multiline">
						{paths.map((path) => (
							<div key={path.path_id} className="column is-6">
								<PathAspectCard
									label={detail?.label}
									examples={path.examples}
									stakeholderRequirements={path.stakeholder_requirements}
									metrics={path.metrics}
								>
									<p className="is-size-7 has-text-grey mb-1">
										{path.use_case_label} · {path.task_label}
									</p>
									<p className="has-text-weight-semibold mb-2">{path.data_source_label}</p>
									{path.definition && <p className="is-size-7">{path.definition}</p>}
								</PathAspectCard>
							</div>
						))}
					</div>
				)}
			</div>
		</>
	);
};

export default AspectDetail;
