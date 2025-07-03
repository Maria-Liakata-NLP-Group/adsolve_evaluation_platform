/** @format */

import { useState, useEffect } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import PropTypes from "prop-types";

const getScoreColour = (score) => {
	// fade from red to green
	const r = Math.floor(255 * (1 - score));
	const g = Math.floor(255 * score);
	return `rgb(${r}, ${g}, 0)`;
};

const mdToHtml = (markdown) => {
	// 1) convert to HTML
	const rawHtml = marked(markdown);

	// 2) sanitize
	const safeHtml = DOMPurify.sanitize(rawHtml);

	// 3) render
	return <span dangerouslySetInnerHTML={{ __html: safeHtml }} />;
};

const getLLMContent = (llm, documentScore, scores, documentId, aspect, tag) => {
	const documentIdText = documentId ? `Summary of document ${documentId}` : "";
	const tagText = tag ? ` for ${tag}.` : "";
	const aspectText =
		aspect && documentScore
			? ` The document's score for ${aspect} is ${documentScore.toFixed(2)}.`
			: "";
	const aspectDetail =
		scores?.length > 0
			? ` Sentence level scores
						for ${aspect} are underlined with red indicated the worst and green
						the best score.`
			: "";
	if (scores?.length > 0) {
		const summary = llm.map((sentence, index) => (
			<span
				key={index}
				style={{
					textDecoration: "underline",
					textDecorationColor: getScoreColour(scores[index]),
					textDecorationThickness: "2px",
				}}
			>
				{mdToHtml(sentence)}{" "}
			</span>
		));
		return (
			<>
				<p className="pt-5">
					<b>
						{documentIdText} {tagText} {aspectText} {aspectDetail}
					</b>
				</p>
				<p
					className="pt-3"
					style={{ height: "500px", overflowY: "scroll" }}
				>
					{summary}
				</p>
			</>
		);
	} else {
		return (
			<>
				<p className="pt-5">
					<b>
						{documentIdText} {tagText} {aspectText}
					</b>
				</p>
				<p
					className="pt-3"
					style={{ height: "500px", overflowY: "scroll" }}
				>
					{mdToHtml(llm[0])}
				</p>
			</>
		);
	}
};

const getGoldContent = (gold, documentId) => {
	const documentIdText = documentId ? `Summary of document ${documentId}` : "";
	return (
		<>
			<p className="pt-5">
				<b>{documentIdText}</b>
			</p>
			<p
				className="pt-3"
				style={{ height: "500px", overflowY: "scroll" }}
			>
				{gold}
			</p>
		</>
	);
};

const defaultSentence =
	"Please select a datapoint from the metrics to the left to view summaries.";

const DocumentDisplay = ({
	llm = [defaultSentence],
	gold = defaultSentence,
	scores = [],
	documentId = "",
	aspect = "",
	tag = "",
	documentScore = "",
}) => {
	const [selection, setSelection] = useState("LLM");
	const handleSelectionChange = (newSelection) => {
		setSelection(newSelection);
	};
	useEffect(() => {
		console.log(documentScore);
	}, [documentScore]);
	return (
		<>
			<div className="tabs is-toggle">
				<ul>
					<li
						className={selection === "LLM" ? "is-active" : ""}
						onClick={() => handleSelectionChange("LLM")}
					>
						<a>
							<span>LLM Summary</span>
						</a>
					</li>
					<li
						className={selection === "Gold" ? "is-active" : ""}
						onClick={() => handleSelectionChange("Gold")}
					>
						<a>
							<span>Gold Summary</span>
						</a>
					</li>
				</ul>
			</div>
			<div className="is-box has-border is-rounded p-5">
				{selection === "LLM"
					? getLLMContent(llm, documentScore, scores, documentId, aspect, tag)
					: getGoldContent(gold, documentId)}
			</div>
		</>
	);
};

DocumentDisplay.propTypes = {
	llm: PropTypes.arrayOf(PropTypes.string),
	gold: PropTypes.string,
	scores: PropTypes.arrayOf(PropTypes.number),
	documentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	aspect: PropTypes.string,
	tag: PropTypes.string,
	documentScore: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

DocumentDisplay.defaultProps = {
	llm: [defaultSentence],
	gold: defaultSentence,
	scores: [],
	documentId: "",
	aspect: "",
	tag: "",
	documentScore: "",
};

export default DocumentDisplay;
