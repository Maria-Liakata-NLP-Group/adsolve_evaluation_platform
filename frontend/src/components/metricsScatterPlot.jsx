/** @format */
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Plot from "react-plotly.js";
import InfoTooltip from "./InfoTooltip";

const MetricsScatterPlot = ({
	documentIds,
	dataPoints,
	showDetails,
	aspect,
	metric,
	metricDescription,
	tags,
	highlightedId,
	highlightedTag,
	means,
}) => {
	const [x, setX] = useState([]);
	const [y, setY] = useState([]);
	const [pointColours, setPointColours] = useState([]);
	const [pointSizes, setPointSizes] = useState([]);
	const [pointMeta, setPointMeta] = useState([]);

	useEffect(() => {
		const tempx = [];
		const tempy = [];
		const tempMeta = [];
		const tempColours = [];
		const tempSizes = [];

		for (let i = 0; i < dataPoints.length; i++) {
			for (let j = 0; j < dataPoints[i].length; j++) {
				const id = documentIds[i][j];
				tempx.push(dataPoints[i][j]);
				tempy.push(tags[i]);
				tempMeta.push({ docId: id, tag: tags[i], metricId: aspect });

				if (id === highlightedId && tags[i] === highlightedTag) {
					tempColours.push("rgba(255, 0, 0, 1)");
					tempSizes.push(16);
				} else {
					tempColours.push("rgba(0, 0, 255, 0.5)");
					tempSizes.push(12);
				}
			}
		}

		setPointColours(tempColours);
		setPointSizes(tempSizes);
		setPointMeta(tempMeta);
		setX(tempx);
		setY(tempy);
	}, [dataPoints, tags, documentIds, aspect, highlightedId, highlightedTag]);

	// Build vertical line segments at mean x-values for each tag
	const meanLineX = [];
	const meanLineY = [];
	means.forEach((meanVal, idx) => {
		meanLineX.push(meanVal, meanVal, null);
		meanLineY.push(tags[idx], tags[idx], null);
	});

	const meanLineTrace = {
		x: meanLineX,
		y: meanLineY,
		mode: "markers+lines",
		type: "scatter",
		marker: {
			symbol: "line-ns-open",
			size: 16,
			color: "blue",
			line: { width: 2 },
		},
		hoverinfo: "skip",
		showlegend: false,
	};

	const plotData = [
		meanLineTrace,
		{
			x,
			y,
			customdata: pointMeta,
			mode: "markers",
			type: "scatter",
			marker: { size: pointSizes, color: pointColours },
			showlegend: false,
		},
	];

	const layout = {
		xaxis: { title: "X Axis" },
		yaxis: {
			title: "Y Label",
			type: "category",
			categoryorder: "array",
			categoryarray: tags,
			autorange: "reversed",
			automargin: true,
		},
		margin: { l: 70, r: 20, t: 10, b: 20, pad: 0 },
		width: 700,
		height: tags.length * 30 + 60,
	};

	const handlePointClick = (event) => {
		if (!event?.points) return;
		const point = event.points[0];
		showDetails({ value: point.x, ...point.customdata });
	};

	return (
		<div className="p-4">
			<div
				style={{
					display: "flex",
					alignItems: "center",
					marginBottom: "0.25rem",
				}}
			>
				<span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#333" }}>
					{metric}
				</span>
				<InfoTooltip text={metricDescription} />
			</div>
			<Plot
				data={plotData}
				layout={layout}
				onClick={handlePointClick}
			/>
		</div>
	);
};

MetricsScatterPlot.propTypes = {
	documentIds: PropTypes.arrayOf(
		PropTypes.arrayOf(
			PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		),
	).isRequired,
	dataPoints: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
	showDetails: PropTypes.func,
	aspect: PropTypes.string,
	metric: PropTypes.string,
	metricDescription: PropTypes.string,
	tags: PropTypes.arrayOf(PropTypes.string).isRequired,
	means: PropTypes.arrayOf(PropTypes.number),
	highlightedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	highlightedTag: PropTypes.string,
};

MetricsScatterPlot.defaultProps = {
	showDetails: () => {},
	aspect: "",
	metric: "",
	metricDescription: null,
	means: [],
	highlightedId: null,
	highlightedTag: "",
};

export default MetricsScatterPlot;
