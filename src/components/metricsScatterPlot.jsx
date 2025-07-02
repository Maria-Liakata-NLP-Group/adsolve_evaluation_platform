/** @format */
import { useState, useEffect } from "react";
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
	values,
	tags,
}) => {
	const [x, setX] = useState([]);
	const [y, setY] = useState([]);
	const [pointDetail, setPointDetail] = useState();

	useEffect(() => {
		console.log(`tags: ${tags}`);
	});

	useEffect(() => {
		const loadData = () => {
			const tempx = [];
			const tempy = [];
			const tempPointDetail = [];
			for (let i = 0; i < dataPoints.length; i++) {
				for (let j = 0; j < dataPoints[i].length; j++) {
					const id = documentIds[i][j];
					tempx.push(dataPoints[i][j]);
					tempy.push(tags[i]);
					if (detail[i] && detail[i][j]) {
						tempPointDetail.push({
							gold: goldSummaries[i][id],
							llm: detail[i][j].sents,
							scores: detail[i][j].scores,
						});
					} else {
						tempPointDetail.push({
							gold: goldSummaries[i][id],
							llm: [llmSummaries[i][id]],
							scores: [],
						});
					}
				}
			}
			setPointDetail(tempPointDetail);
			setX(tempx);
			setY(tempy);
		};

		if (detail) {
			loadData();
		}
	}, [dataPoints, detail, tags, goldSummaries, llmSummaries]);

	const data = [
		{
			x: x,
			y: y,
			customdata: pointDetail,
			mode: "markers",
			type: "scatter",
			marker: { size: 12, color: "blue" },
		},
	];

	const layout = {
		title: { text: aspect, font: { size: 18 } },
		xaxis: { title: "X Axis" },
		yaxis: {
			title: "Y Label",
			type: "category",
			categoryorder: "array",
			categoryarray: tags,
			autorange: "reversed",
		},
		width: 600,
		height: 300,
	};

	const onPointClick = (pointData) => console.log(pointData);

	const handlePointClick = (event) => {
		if (!event || !event.points) return;
		const point = event.points[0];
		showDetails(
			point.customdata.gold,
			point.customdata.llm,
			point.customdata.scores
		);
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

export default MetricsScatterPlot;
