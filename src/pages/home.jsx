/** @format */
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
	const navigate = useNavigate();
	const onClick = (route) => navigate(route);

	return (
		<section className="section">
			<div className="container is-max-desktop">
				<div className="has-text-centered mb-6">
					<h1 className="title is-1">AdSoLve</h1>
					<p
						className="subtitle is-3 mx-auto"
						style={{ maxWidth: "900px" }}
					>
						The evidence you need to trust that the models you use are safe,
						reliable and fit for purpose in the real world
					</p>
				</div>

				<div className="columns is-variable is-5 mb-6">
					<div className="column">
						<div className="box has-text-centered">
							<h2 className="title is-4">Use case specificity</h2>
							<p>Evaluations tailored to your real-world context</p>
						</div>
					</div>

					<div className="column">
						<div className="box has-text-centered">
							<h2 className="title is-4">Safety &amp; reliability</h2>
							<p>Rigorous assessment of model performance</p>
						</div>
					</div>
				</div>

				<div className="columns is-variable is-5 mb-6">
					<div className="column">
						<div className="box has-text-centered">
							<h2 className="title is-4">Transparent metrics</h2>
							<p>Clear, measurable criteria for decision-making</p>
						</div>
					</div>

					<div className="column">
						<div className="box has-text-centered">
							<h2 className="title is-4">Technical rigour</h2>
							<p>Built on innovative evaluation frameworks</p>
						</div>
					</div>
				</div>

				<div className="columns is-centered is-variable is-8 my-6">
					<div className="column is-narrow">
						<button
							className="button is-large px-6 py-5"
							onClick={() => onClick("/use-cases")}
						>
							Use Cases
						</button>
					</div>

					<div className="column is-narrow">
						<button
							className="button is-large px-6 py-5"
							onClick={() => onClick("/evaluation-script-builder")}
						>
							Evaluation Builder
						</button>
					</div>
				</div>

				<hr className="my-6" />

				<div className="content">
					<div className="mb-5">
						<h3 className="title is-5 mb-2">DOMAIN FOCUS</h3>
						<p>
							Purpose-built for healthcare and legal domains, where generic
							benchmarks don&apos;t capture what matters for real-world use
							cases.
						</p>
					</div>

					<div className="mb-5">
						<h3 className="title is-5 mb-2">CO-CREATED WITH STAKEHOLDERS</h3>
						<p>
							Developed through collaboration with people with lived experience,
							clinicians, lawyers, legal advice seekers, regulators, academics
							and industry partners.
						</p>
					</div>

					<div>
						<h3 className="title is-5 mb-2">COMPLEMENTS HUMAN EVALUATION</h3>
						<p>
							Technical evaluation designed to work alongside human, clinical,
							legal, and organisational evaluation processes.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
};

export default LandingPage;
