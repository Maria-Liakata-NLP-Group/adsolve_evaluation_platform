/** @format */

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import LeaderBoard from "../components/leaderBoard";
import MetricsScatterPlot from "../components/metricsScatterPlot";
import ExampleModal from "../components/exampleModal";

const getScoreColour = (score) => {
	// fade from red to green
	const r = Math.floor(255 * (1 - score));
	const g = Math.floor(255 * score);
	return `rgb(${r}, ${g}, 0)`;
};

// write a function that sorts an array of values and returns the sorted indicies
const getSortedIndices = (values) => {
	const indices = values
		.map((value, index) => ({ value, index }))
		.sort((a, b) => b.value - a.value); // Sort by descending values

	return indices.map((item) => item.index);
};

const Dashboard = () => {
	const { useCase, task } = useParams();
	const [title, setTitle] = useState("");
	const [data, setData] = useState(null);
	const [datasetNames, setDatasetNames] = useState(null);
	const [modelNames, setModelNames] = useState(null);
	const [aspectNames, setAspectNames] = useState(null);
	const [aspectDetails, setAspectDetails] = useState(null);
	const [currentDataset, setCurrentDataset] = useState(null);
	const [currentModel, setCurrentModel] = useState(null);
	const [leaderBoardData, setLeaderBoardData] = useState({});
	const [error, setError] = useState(null);
	const [showModal, setShowModal] = useState(false);
	const [modalDetails, setModalDetails] = useState(null);

	const getModalDetails = (gold, llm_sents, llm_sent_scores) => {
		// setShowModal(true);
		setModalDetails({
			gold: gold,
			llm_sents: llm_sents,
			llm_sent_scores: llm_sent_scores,
		});
	};

	useEffect(() => {
		if (useCase && task) {
			// replace dashes with spaces
			const useCaseTitle = useCase.replace(/-/g, " ");
			const taskTitle = task.replace(/-/g, " ");

			// create title dom element
			const titleElement = (
				<h1 className="title is-capitalized">{`${useCaseTitle} -> ${taskTitle}`}</h1>
			);
			setTitle(titleElement);
		}
	}, [useCase, task]);

	useEffect(() => {
		const calculateLeaderboards = async () => {
			const leaderBoards = {};
			// Organise data by model
			if (currentDataset !== null) {
				const datasetName = datasetNames[currentDataset];
				for (const aspect of aspectNames) {
					const metricValues = [];
					const metricDetails = [];
					const metricDataPoints = [];
					const documentIds = [];
					const goldSummaries = [];
					const llmSummaries = [];
					for (const model of modelNames) {
						metricValues.push(data[datasetName][model][aspect]["mean"]);
						metricDataPoints.push(
							data[datasetName][model][aspect]["document_level"]
						);
						documentIds.push(data[datasetName][model]["document_ids"]);
						if (
							Object.keys(data[datasetName][model][aspect]).includes("detail")
						) {
							metricDetails.push(data[datasetName][model][aspect]["detail"]);
						}
						goldSummaries.push(data[datasetName]["gold_summary"]);
						llmSummaries.push(data[datasetName][model]["llm_summary"]);
					}

					const sortedIndices = getSortedIndices(metricValues);
					const sortedMetricValues = sortedIndices.map(
						(index) => metricValues[index]
					);
					const sortedMetricDataPoints = sortedIndices.map(
						(index) => metricDataPoints[index]
					);
					const sortedDocumentIds = sortedIndices.map(
						(index) => documentIds[index]
					);
					const sortedModelNames = sortedIndices.map(
						(index) => modelNames[index]
					);
					const sortedMetricDetails = sortedIndices.map(
						(index) => metricDetails[index]
					);
					const sortedLlmSummaries = sortedIndices.map(
						(index) => llmSummaries[index]
					);

					leaderBoards[aspect] = {
						documentIds: sortedDocumentIds,
						goldSummaries: goldSummaries,
						llmSummaries: sortedLlmSummaries,
						dataPoints: sortedMetricDataPoints,
						detail: sortedMetricDetails,
						metric: aspectDetails[aspect],
						values: sortedMetricValues,
						tags: sortedModelNames,
					};
				}
			}
			// Organise data by dataset
			else if (currentModel !== null) {
				const modelName = modelNames[currentModel];
				for (const aspect of aspectNames) {
					const metricValues = [];
					const metricDetails = [];
					const metricDataPoints = [];
					const documentIds = [];
					const goldSummaries = [];
					const llmSummaries = [];
					for (const dataset of datasetNames) {
						metricValues.push(data[dataset][modelName][aspect]["mean"]);
						metricDataPoints.push(
							data[dataset][modelName][aspect]["document_level"]
						);
						documentIds.push(data[dataset][modelName]["document_ids"]);
						if (
							Object.keys(data[dataset][modelName][aspect]).includes("detail")
						) {
							metricDetails.push(data[dataset][modelName][aspect]["detail"]);
						}
						goldSummaries.push(data[dataset]["gold_summary"]);
						llmSummaries.push(data[dataset][modelName]["llm_summary"]);
					}

					const sortedIndices = getSortedIndices(metricValues);
					const sortedMetricValues = sortedIndices.map(
						(index) => metricValues[index]
					);
					const sortedMetricDataPoints = sortedIndices.map(
						(index) => metricDataPoints[index]
					);
					const sortedDocumentIds = sortedIndices.map(
						(index) => documentIds[index]
					);
					const sortedDatasetNames = sortedIndices.map(
						(index) => datasetNames[index]
					);
					const sortedMetricDetails = sortedIndices.map(
						(index) => metricDetails[index]
					);
					const sortedLlmSummaries = sortedIndices.map(
						(index) => llmSummaries[index]
					);

					leaderBoards[aspect] = {
						documentIds: sortedDocumentIds,
						goldSummaries: goldSummaries,
						llmSummaries: sortedLlmSummaries,
						dataPoints: sortedMetricDataPoints,
						detail: sortedMetricDetails,
						metric: aspectDetails[aspect],
						values: sortedMetricValues,
						tags: sortedDatasetNames,
					};
				}
			}
			// Set the leaderboards
			if (currentDataset !== null || currentModel !== null) {
				setLeaderBoardData(leaderBoards);
			}
		};

		setLeaderBoardData(null);
		calculateLeaderboards();
	}, [
		aspectDetails,
		currentDataset,
		currentModel,
		data,
		datasetNames,
		modelNames,
		aspectNames,
	]);

	useEffect(() => {
		const loadData = async () => {
			try {
				// Dynamically import the JSON file based on the title
				const module = await import(`../data/${task}.json`);
				const tempData = module.default;

				// Set the data and names
				setData(tempData.data);
				setDatasetNames(tempData.metadata.datasets);
				setModelNames(tempData.metadata.models);
				setAspectNames(tempData.metadata.metrics);
				setAspectDetails(tempData.metadata.metric_details);
				setCurrentDataset(0);
			} catch (err) {
				setError(`Could not load data for ${task} with error: ${err.message}`);
			}
		};

		loadData();
	}, [task, data]);

	if (error) {
		return <div>Error: {error}</div>;
	}

	if (!data) {
		return <div>Loading...</div>;
	}

	const clickOnDataset = (index) => {
		setCurrentDataset(index);
		setCurrentModel(null);
	};

	const clickOnModel = (index) => {
		setCurrentModel(index);
		setCurrentDataset(null);
	};

	return (
		<>
			<ExampleModal
				gold={modalDetails?.gold}
				llm_sents={modalDetails?.llm_sents}
				llm_sent_scores={modalDetails?.llm_sent_scores}
				active={showModal}
				onClickFunction={() => setShowModal(false)}
			/>
			<div>
				<h1 className="title">{title}</h1>
				<section className="block">
					<div>
						<h2 className="subtitle">Filter by</h2>
					</div>
					<div className="is-flex">
						{/* <div> */}
						<div className="is-flex is-align-items-center">
							<div style={{ width: "80px" }}>Datasets:</div>
							<div>
								<div className="tags">
									{datasetNames
										? datasetNames.map((datasetName, index) => (
												<span
													key={index}
													className={`tag has-border ${
														currentDataset === index ? "is-dark" : "is-light"
													}`}
													onClick={() => clickOnDataset(index)}
												>
													{datasetName}
												</span>
										  ))
										: "No datasets to display"}
								</div>
							</div>
							<button className="button is-dark mt-2">Add dataset</button>
						</div>
						<div className="is-flex is-align-items-center">
							<div style={{ width: "80px" }}>Models:</div>
							<div className="tags">
								{modelNames
									? modelNames.map((modelName, index) => (
											<span
												key={index}
												className={`tag has-border ${
													currentModel === index ? "is-dark" : "is-light"
												}`}
												onClick={() => clickOnModel(index)}
											>
												{modelName}
											</span>
									  ))
									: "No models to display"}
							</div>
							<button className="button is-dark mb-2">Add model</button>
						</div>
						{/* </div> */}
						{/* <div className="is-flex is-flex-direction-row is-justify-content-space-between ml-5"></div> */}
					</div>
				</section>
				<section className="block">
					<div className="is-flex">
						<div>
							{leaderBoardData
								? Object.entries(leaderBoardData).map(
										(
											[
												aspect,
												{
													documentIds,
													goldSummaries,
													llmSummaries,
													dataPoints,
													detail,
													metric,
													values,
													tags,
												},
											],
											index
										) => (
											<div key={index}>
												<MetricsScatterPlot
													key={index}
													dataPoints={dataPoints}
													documentIds={documentIds}
													goldSummaries={goldSummaries}
													llmSummaries={llmSummaries}
													detail={detail}
													showDetails={getModalDetails}
													aspect={aspect}
													metric={metric}
													values={values}
													tags={tags}
												/>
											</div>
										)
								  )
								: "Nothing to see here"}
						</div>
						<div>
							<h2 className="subtitle">LLM</h2>
							{modalDetails?.llm_sents?.map((sentence, index) => (
								<span
									key={index}
									style={{
										textDecoration: "underline",
										textDecorationColor: getScoreColour(
											modalDetails.llm_sent_scores[index]
										),
										textDecorationThickness: "2px",
									}}
								>
									{sentence}{" "}
								</span>
							))}
						</div>
					</div>
				</section>
			</div>
		</>
	);
};

export default Dashboard;
