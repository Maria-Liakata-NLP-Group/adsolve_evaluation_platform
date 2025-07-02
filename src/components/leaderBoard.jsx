/** @format */

import { useState, useEffect } from "react";
import ExampleModal from "./exampleModal";

const createTimelineDataPoint = (mean, onClickFunction) => {
	return (
		<div
			className="timeline-dot"
			onClick={onClickFunction}
			style={{ left: `${100 * mean}%` }}
		></div>
	);
};

const metricToTooltip = {
	MHIC_sem:
		"This reflects whether the output captures relevant mental health concepts.",
	FC_expert:
		"This reflects the average logical consistency of sentences in the generated output relative to the human-written document.",
	EA: "This reflects whether the final output is consistent with the intermediate outputs.",
	IntraNLI:
		"This reflects whether information presented in a model output is logically consistent with the rest of the generated document.",
};

const LeaderBoard = ({
	documentIds,
	dataPoints,
	goldSummaries,
	llmSummaries,
	detail,
	showDetails,
	aspect,
	metric,
	values,
	tags,
}) => {
	const [timelineDataPoints, setTimelineDataPoints] = useState([]);

	useEffect(() => {
		const loadData = () => {
			const allDetailPoints = documentIds.map((ids, i) => {
				const detailNode = ids.map((id, j) => {
					if (!dataPoints[i] || !dataPoints[i][j]) {
						return null;
					}
					// console.log("Print stuff");
					// console.log(llmSummaries[i][id]);
					if (!detail[i] || !detail[i][j]) {
						return createTimelineDataPoint(dataPoints[i][j], () =>
							showDetails(goldSummaries[i][id], [llmSummaries[i][id]], [])
						);
					}
					return createTimelineDataPoint(dataPoints[i][j], () =>
						showDetails(
							goldSummaries[i][id],
							detail[i][j].sents,
							detail[i][j].scores
						)
					);
				});
				return detailNode;
			});
			setTimelineDataPoints(allDetailPoints);
		};
		if (detail) {
			loadData();
		}
	}, [detail, showDetails]);

	return (
		<>
			<div className="cell">
				{/* <h1>Leaderboard</h1> */}
				<div className="is-flex is-align-items-center">
					<div>
						<h2 className="subtitle">{aspect}</h2>
						<b>Metric: </b> {metric}
					</div>
					<div className="ml-4">
						<div className="tooltip">
							?<span className="tooltiptext">{metricToTooltip[metric]}</span>
						</div>
					</div>
				</div>
				<div className="has-border has-rounded p-5">
					<ul>
						{values.map((value, index) => (
							<li
								className="is-relative"
								key={index}
							>
								<progress
									className="progress is-large"
									value={value}
									max="100"
								>
									{value}%
								</progress>
								<div style={{ width: "100%", position: "absolute", top: 0 }}>
									{timelineDataPoints[index]}
								</div>
								<span>{tags[index]}</span>
							</li>
						))}
					</ul>
				</div>
			</div>
		</>
	);
};

export default LeaderBoard;
