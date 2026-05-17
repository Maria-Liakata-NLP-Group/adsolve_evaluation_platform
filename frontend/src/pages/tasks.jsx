/** @format */

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Breadcrumbs from "../components/breadcrumbs";
import ContentSquare from "../components/contentSquare";
import { getPaths } from "../api/config";
import { getRunByPath } from "../api/runs";

const createCardContent = (title, description, taskLabel) => (
	<div>
		<h3 className="subtitle is-capitalized has-text-weight-semibold">
			{title}
		</h3>
		<p className="tag is-info is-light mb-2">{taskLabel}</p>
		{description && (
			<p className="mt-2">
				<i>{description}</i>
			</p>
		)}
	</div>
);

const Tasks = () => {
	const { useCaseId } = useParams();
	const navigate = useNavigate();
	const [tasks, setTasks] = useState([]);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!useCaseId) return;
		getPaths(useCaseId)
			.then((paths) =>
				Promise.all(
					paths.map((path) =>
						getRunByPath(path.id)
							.then((run) => ({ path, run }))
							.catch(() => null),
					),
				),
			)
			.then((results) => setTasks(results.filter(Boolean)))
			.catch((err) => setError(err.message));
	}, [useCaseId]);

	if (error) return <div>Error: {error}</div>;

	return (
		<div>
			<Breadcrumbs labels={{ [useCaseId]: tasks[0]?.path.use_case_label }} />
			<h1 className="title is-capitalized">Select a task!</h1>
			<div className="m-5"></div>
			<div className="fixed-grid has-4-cols has-2-cols-mobile">
				<div className="grid">
					{tasks.map(({ path, run }) => (
						<ContentSquare
							key={path.id}
							content={createCardContent(
								run.title,
								run.description,
								path.task_label,
							)}
							onClick={() => navigate(`/use-cases/${useCaseId}/${path.id}`)}
						/>
					))}
				</div>
			</div>
		</div>
	);
};

export default Tasks;
