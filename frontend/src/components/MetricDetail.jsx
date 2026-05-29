/** @format */

import { useEffect, useState } from "react";
import { getMetric } from "../api/config";
import AssociatedItems from "./AssociatedItems";
import DescriptionSection from "./DescriptionSection";

// Transform a string array into the {id, label} shape AssociatedItems expects
const toItems = (strings) => (strings ?? []).map((s) => ({ id: s, label: s }));

const MetricDetail = ({ metricId, onNavigateToAspect }) => {
	const [detail, setDetail] = useState(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!metricId) return;
		const fetchDetail = async () => {
			setLoading(true);
			try {
				const data = await getMetric(metricId);
				setDetail(data);
			} catch {
				setDetail(null);
			} finally {
				setLoading(false);
			}
		};
		fetchDetail();
	}, [metricId]);

	if (!detail && !loading) return null;

	return (
		<>
			<p
				className="is-size-7 has-text-grey is-uppercase"
				style={{ letterSpacing: "0.08em", marginBottom: "0.25rem" }}
			>
				Metric
			</p>
			<h2
				className="title is-4"
				style={{ marginBottom: "1.5rem" }}
			>
				{detail?.label}
			</h2>
			<DescriptionSection description={detail?.description} />
			<div style={{ marginBottom: "1rem" }}>
				<AssociatedItems
					label="Tags"
					items={toItems(detail?.tags)}
					loading={loading}
				/>
			</div>
			<div style={{ marginBottom: "1rem" }}>
				<AssociatedItems
					label="Supported Reference Modes"
					items={toItems(detail?.supported_reference_modes)}
					loading={loading}
				/>
			</div>
			<div style={{ marginBottom: "1.5rem" }}>
				<AssociatedItems
					label="Supported Compute Environments"
					items={toItems(detail?.supported_compute_environments)}
					loading={loading}
				/>
			</div>
			<AssociatedItems
				label="Associated Aspects"
				items={detail?.aspects ?? []}
				loading={loading}
				onItemClick={onNavigateToAspect}
			/>
		</>
	);
};

export default MetricDetail;
