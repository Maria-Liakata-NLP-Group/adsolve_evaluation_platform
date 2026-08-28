/** @format */

import { useState, useEffect } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import PropTypes from "prop-types";

const getScoreColour = (score) => {
	if (score == null) return "transparent";
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

const createInputContent = (inp, index) => {
	// check if inp starts with "/images/"
	if (inp.startsWith("/images/")) {
		return (
			<div
				key={index}
				className="mt-1 mb-1"
				style={{
					flex: "1 1 0px",
					backgroundImage: `url(${inp})`,
					backgroundSize: "contain", // scale image to fit box
					backgroundRepeat: "no-repeat", // prevent tiling
					backgroundPosition: "center", // center it
					backgroundColor: "black", // optional background
					width: "100%", // take full width of container
					maxWidth: "580px", // cap width so it doesn't stretch too far
					borderRadius: "8px",
				}}
			/>
		);
	} else {
		return (
			<p
				key={index}
				className="mt-5"
			>
				{inp}
			</p>
		);
	}
};

const getInputContent = (input) => {
	return (
		<div className="is-flex is-flex-direction-column scroll-fill">
			{input.map((inp, index) => createInputContent(inp, index))}
		</div>
	);
};

const getLLMContent = (
	llm,
	documentScore,
	scores,
	documentId,
	aspect,
	tag,
	inputButton,
) => {
	if (llm.length === 0) return null;
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
				{inputButton}
				<p className="pt-5">
					<b>
						{documentIdText} {tagText} {aspectText} {aspectDetail}
					</b>
				</p>
				<p className="pt-3 scroll-fill">{summary}</p>
			</>
		);
	} else {
		return (
			<>
				{inputButton}
				<p className="pt-5">
					<b>
						{documentIdText} {tagText} {aspectText}
					</b>
				</p>
				<p className="pt-3 scroll-fill">{mdToHtml(llm[0])}</p>
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
			<p className="pt-3 scroll-fill">{gold}</p>
		</>
	);
};

const defaultSentence =
	"Please select a datapoint in the scatter plot to view details.";

const DocumentDisplay = ({
	llm = [],
	gold = "",
	input = [],
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
	return (
		<div
			className="is-rounded p-5 bg-surface is-flex-grow-1 min-w-0 is-flex is-flex-direction-column"
			style={{ overflowWrap: "break-word" }}
		>
			<div className="buttons has-addons mb-0">
				{input.length > 0 && (
					<button
						type="button"
						className={`button is-small  ${selection === "Input" ? "is-link is-selected" : ""}`}
						style={{ flex: "1 1 0" }}
						onClick={() => handleSelectionChange("Input")}
					>
						Input
					</button>
				)}
				{llm.length > 0 && (
					<button
						type="button"
						className={`button is-small  ${selection === "LLM" ? "is-link is-selected" : ""}`}
						style={{ flex: "1 1 0" }}
						onClick={() => handleSelectionChange("LLM")}
					>
						LLM Summary
					</button>
				)}
				{gold && (
					<button
						type="button"
						className={`button is-small  ${selection === "Gold" ? "is-link is-selected" : ""}`}
						style={{ flex: "1 1 0" }}
						onClick={() => handleSelectionChange("Gold")}
					>
						Gold Summary
					</button>
				)}
			</div>

			{selection === "Input" && getInputContent(input)}
			{selection === "LLM" &&
				getLLMContent(
					llm,
					documentScore,
					scores,
					documentId,
					aspect,
					tag,
					null,
				)}
			{selection === "Gold" && getGoldContent(gold, documentId)}
			{!documentScore && defaultSentence}
		</div>
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
	input: PropTypes.oneOfType([
		PropTypes.arrayOf(PropTypes.string),
		PropTypes.undefined,
	]),
};

DocumentDisplay.defaultProps = {
	llm: [],
	gold: "",
	scores: [],
	documentId: "",
	aspect: "",
	tag: "",
	documentScore: "",
	input: undefined,
};

export default DocumentDisplay;
