/** @format */
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Plot from "react-plotly.js";

const MetricsScatterPlot = ({
	documentIds,
	dataPoints,
	goldSummaries,
	llmSummaries,
	detail,
	showDetails,
	aspect,
	metric,
	tags,
	highlightedId,
	highlightedTag,
	means,
}) => {
	const [x, setX] = useState([]);
	const [y, setY] = useState([]);
	const [pointColours, setPointColours] = useState([]);
	const [pointSizes, setPointSizes] = useState([]);
	const [pointDetail, setPointDetail] = useState([]);

	useEffect(() => {
		const loadData = () => {
			const tempx = [];
			const tempy = [];
			const tempPointDetail = [];
			const tempColours = [];
			const tempSizes = [];
			for (let i = 0; i < dataPoints.length; i++) {
				for (let j = 0; j < dataPoints[i].length; j++) {
					const id = documentIds[i][j];
					tempx.push(dataPoints[i][j]);
					tempy.push(tags[i]);
					if (detail[i] && detail[i][j]) {
						tempPointDetail.push({
							gold: goldSummaries[i][id],
							llm_sents: detail[i][j].sents,
							llm_sent_scores: detail[i][j].scores,
							documentId: id,
							tag: tags[i],
							aspect: aspect,
						});
					} else {
						tempPointDetail.push({
							gold: goldSummaries[i][id],
							llm_sents: [llmSummaries[i][id]],
							llm_sent_scores: [],
							documentId: id,
							tag: tags[i],
							aspect: aspect,
						});
					}
					if (id == highlightedId && tags[i] == highlightedTag) {
						tempColours.push("rgba(255, 0, 0, 1})");
						tempSizes.push(16);
					} else {
						tempColours.push("rgba(0, 0, 255, 0.5})");
						tempSizes.push(12);
					}
				}
			}
			setPointColours(tempColours);
			setPointSizes(tempSizes);
			setPointDetail(tempPointDetail);
			setX(tempx);
			setY(tempy);
		};

		if (detail) {
			loadData();
		}
	}, [
		dataPoints,
		detail,
		tags,
		goldSummaries,
		llmSummaries,
		documentIds,
		aspect,
		highlightedId,
		highlightedTag,
	]);

	// Build vertical line segments at mean x-values for each tag
	const meanLineX = [];
	const meanLineY = [];
	means.forEach((meanVal, idx) => {
		// each line: from just above to just below the category
		meanLineX.push(meanVal, meanVal, null);
		meanLineY.push(tags[idx], tags[idx], null);
	});

	const meanLineTrace = {
		x: meanLineX,
		y: meanLineY,
		mode: "markers+lines",
		type: "scatter",
		marker: {
			symbol: "line-ns-open", // vertical line marker
			size: 16, // length of the line
			color: "blue",
			line: { width: 2 },
		},
		hoverinfo: "skip",
		showlegend: false,
	};

	const data = [
		meanLineTrace,
		{
			x: x,
			y: y,
			customdata: pointDetail,
			mode: "markers",
			type: "scatter",
			marker: { size: pointSizes, color: pointColours },
			showlegend: false,
		},
	];

	const layout = {
		title: { text: metric, font: { size: 16 }, x: 0, xanchor: "left" },
		xaxis: { title: "X Axis" },
		yaxis: {
			title: "Y Label",
			type: "category",
			categoryorder: "array",
			categoryarray: tags,
			autorange: "reversed",
		},
		margin: { l: 70, r: 20, t: 40, b: 0, pad: 0 },
		width: 600,
		height: tags.length * 30 + 40, // Adjust height based on number of tags
	};

	const handlePointClick = (event) => {
		if (!event || !event.points) return;
		const point = event.points[0];
		showDetails({ value: point.x, ...point.customdata });
	};

	return (
		<div className="p-4">
			<Plot
				data={data}
				layout={layout}
				onClick={handlePointClick}
			/>
		</div>
	);
};

MetricsScatterPlot.propTypes = {
	documentIds: PropTypes.arrayOf(
		PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number]))
	).isRequired,
	dataPoints: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
	goldSummaries: PropTypes.arrayOf(PropTypes.object).isRequired,
	llmSummaries: PropTypes.arrayOf(PropTypes.object).isRequired,
	detail: PropTypes.array,
	showDetails: PropTypes.func,
	aspect: PropTypes.string,
	metric: PropTypes.string,
	tags: PropTypes.arrayOf(PropTypes.string).isRequired,
	means: PropTypes.arrayOf(PropTypes.number),
	title: PropTypes.string,
	onPointClick: PropTypes.func,
	highlightedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	highlightedTag: PropTypes.string,
};

MetricsScatterPlot.defaultProps = {
	detail: [],
	showDetails: () => {},
	aspect: "",
	metric: "",
	means: [],
	title: "Metrics Scatter Plot",
	onPointClick: () => {},
	highlightedId: null,
	highlightedTag: "",
};

export default MetricsScatterPlot;
