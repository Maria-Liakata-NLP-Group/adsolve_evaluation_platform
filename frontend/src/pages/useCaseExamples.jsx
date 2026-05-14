/** @format */

import { useParams, useNavigate } from "react-router-dom";
import { loadAllJsonInFolder } from "../utils/loadJsonFolder";
import Breadcrumbs from "../components/breadcrumbs";
import ContentSquare from "../components/contentSquare";

const createCardContent = (title, goal, description, aspects) => {
	return (
		<div>
			<h3 className="subtitle is-capitalized has-text-weight-semibold">
				{title}
			</h3>
			<p>
				<strong>Goals:</strong> {goal}
			</p>
			<p className="mt-2">
				<i>{description}</i>
			</p>
			<p className="mt-2">
				<strong>Aspects:</strong>{" "}
				{aspects.map((aspect, index) => (
					<span
						className="tag is-info is-light"
						key={index}
					>
						{aspect}
					</span>
				))}
			</p>
		</div>
	);
};

const UseCaseExamples = () => {
	const { useCase } = useParams();

	const navigate = useNavigate();

	const onClick = (title) => navigate(`/use-cases/${useCase}/${title}`);

	const tasks = loadAllJsonInFolder(useCase);
	return (
		<div>
			<Breadcrumbs />
			<h1 className="title is-capitalized">Select a task!</h1>
			<div className="m-5"></div>
			<div className="fixed-grid has-4-cols has-2-cols-mobile">
				<div className="grid">
					{tasks.map((task) => {
						return (
							<ContentSquare
								content={createCardContent(
									task.data.metadata.title,
									task.data.metadata.goals,
									task.data.metadata.description,
									task.data.metadata.aspects
								)}
								onClick={() => onClick(task.slug)}
								key={task.path}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export default UseCaseExamples;
