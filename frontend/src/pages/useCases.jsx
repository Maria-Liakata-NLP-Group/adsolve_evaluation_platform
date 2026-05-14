/** @format */

import Breadcrumbs from "../components/breadcrumbs";
import ContentSquare from "../components/contentSquare";
import { useNavigate } from "react-router-dom";
import useCaseData from "../data/UseCases.json";

const UseCases = () => {
	const navigate = useNavigate();
	const onClick = (title) => {
		// replace spaces with dashes and turn everything to lowercase
		title = title.toLowerCase().replace(/ /g, "-");
		navigate(`/use-cases/${title}`);
	};

	return (
		<div>
			<Breadcrumbs />
			<h1 className="title">Select a use case!</h1>
			<section className="block">
				<div className="m-5"></div>
				<div className="fixed-grid has-4-cols has-2-cols-mobile">
					<div className="grid">
						{Object.keys(useCaseData).map((title) => {
							return (
								<ContentSquare
									content={
										<h1 className="title has-text-centered is-capitalized">
											{title}
										</h1>
									}
									onClick={() => onClick(title)}
									key={title}
								/>
							);
						})}
					</div>
				</div>
			</section>
		</div>
	);
};

export default UseCases;
