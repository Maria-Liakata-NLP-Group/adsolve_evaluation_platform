/** @format */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import Plot from "react-plotly.js";
import InfoTooltip from "../modals_and_cards/InfoTooltip";

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
	const navigate = useNavigate();
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
					tempColours.push("rgb(255, 196, 81)");
					tempSizes.push(22);
				} else {
					tempColours.push("rgba(200, 200, 200, 0.7)");
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
			color: "rgba(220, 220, 220, 0.9)",
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

	// Matches text-white-muted — used for axis labels, tick text, and the info icon.
	const labelColor = "rgba(200, 200, 200, 0.9)";

	const axisStyle = {
		color: labelColor,
		gridcolor: "rgba(255, 255, 255, 0.06)",
		zerolinecolor: "rgba(255, 255, 255, 0.1)",
	};

	const layout = {
		xaxis: { title: "X Axis", ...axisStyle },
		yaxis: {
			title: "Y Label",
			type: "category",
			categoryorder: "array",
			categoryarray: tags,
			autorange: "reversed",
			automargin: true,
			...axisStyle,
		},
		plot_bgcolor: "transparent",
		paper_bgcolor: "transparent",
		margin: { l: 70, r: 20, t: 30, b: 20, pad: 0 },
		width: 700,
		height: tags.length * 30 + 60,
		font: { color: labelColor },
	};

	const handlePointClick = (event) => {
		if (!event?.points) return;
		const point = event.points[0];
		showDetails({ value: point.x, ...point.customdata });
	};

	return (
		<div className="p-4">
			<div className="is-flex is-align-items-center mb-1">
				<span className="ls-tight text-white-muted">{metric}</span>
				<InfoTooltip
					text={metricDescription}
					color={labelColor}
					onClick={
						aspect
							? () => navigate(`/library?mode=metrics&id=${aspect}`)
							: undefined
					}
				/>
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
