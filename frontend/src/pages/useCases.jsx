/** @format */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "../components/navigation_and_controls/breadcrumbs";
import ContentSquare from "../components/dashboard/contentSquare";
import { getUseCases } from "../api/config";

const UseCases = () => {
	const navigate = useNavigate();
	const [useCases, setUseCases] = useState([]);
	const [error, setError] = useState(null);

	useEffect(() => {
		getUseCases()
			.then(setUseCases)
			.catch((err) => setError(err.message));
	}, []);

	if (error) return <div>Error: {error}</div>;

	return (
		<div>
			<Breadcrumbs />
			<h1
				className="title is-4"
				style={{ margin: "1.5rem 0 0.25rem" }}
			>
				Use Cases
			</h1>
			<p
				className="subtitle is-6"
				style={{ marginBottom: "1.75rem" }}
			>
				Select a use case to explore evaluations
			</p>
			<div className="section-label">Available use cases</div>
			<div className="fixed-grid has-4-cols has-2-cols-mobile">
				<div className="grid">
					{useCases.map((useCase) => (
						<ContentSquare
							key={useCase.id}
							content={
								<h1 className="title has-text-centered is-capitalized">
									{useCase.label}
								</h1>
							}
							onClick={() =>
								navigate(`/use-cases/${useCase.id}`, {
									state: { useCaseLabel: useCase.label },
								})
							}
						/>
					))}
				</div>
			</div>
		</div>
	);
};

export default UseCases;
