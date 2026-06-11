/** @format */

import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Breadcrumbs from "../components/navigation_and_controls/breadcrumbs";
import RunCard from "../components/modals_and_cards/RunCard";
import { getRuns } from "../api/runs";

const Tasks = () => {
	const { useCaseId } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const [runs, setRuns] = useState([]);
	const [error, setError] = useState(null);
	const [useCaseLabel, setUseCaseLabel] = useState(
		location.state?.useCaseLabel ?? null,
	);

	useEffect(() => {
		if (!useCaseId) return;
		getRuns(useCaseId)
			.then((data) => {
				setRuns(data);
				if (data[0]?.use_case_label) setUseCaseLabel(data[0].use_case_label);
			})
			.catch((err) => setError(err.message));
	}, [useCaseId]);

	if (error) return <div>Error: {error}</div>;

	return (
		<div>
			<Breadcrumbs labels={useCaseLabel ? { [useCaseId]: useCaseLabel } : {}} />
			<h1
				className="title is-4"
				style={{ margin: "1.5rem 0 0.25rem" }}
			>
				{useCaseLabel ?? "Evaluation Runs"}
			</h1>
			<p
				className="subtitle is-6"
				style={{ marginBottom: "1.75rem" }}
			>
				Select a run to view evaluation results
			</p>
			<div className="columns is-multiline">
				{runs.map((run) => (
					<div
						key={run.id}
						className="column is-4"
					>
						<RunCard
							run={run}
							onNavigate={() =>
								navigate(`/runs/${useCaseId}/${run.path_id}/${run.id}`)
							}
						/>
					</div>
				))}
			</div>
		</div>
	);
};

export default Tasks;
