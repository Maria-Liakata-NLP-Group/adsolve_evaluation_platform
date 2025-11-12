/** @format */

// import { useState } from "react";
import PropTypes from "prop-types";

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
		return <p key={index}>{inp}</p>;
	}
};

const InputDisplay = ({ input, active, onClose }) => {
	return (
		<div
			className={`modal is-align-items-start pl-5 ${active ? "is-active" : ""}`}
			onClick={onClose}
		>
			<div
				className="modal-content is-flex is-justify-content-center"
				style={{
					margin: 0,
					borderRadius: "12px",
					backgroundColor: "white",
					boxShadow: "0 0 25px 5px rgba(0, 0, 0, 0.4)", // glow color & softness
					transition: "box-shadow 0.3s ease",
				}}
			>
				<div
					className="box is-flex is-flex-direction-column"
					style={{ height: "90vh", width: "100%" }}
				>
					{input.map((inp, index) => createInputContent(inp, index))}
				</div>
			</div>
		</div>
	);
};

InputDisplay.propTypes = {
	input: PropTypes.arrayOf(PropTypes.string).isRequired,
	active: PropTypes.bool,
	onClose: PropTypes.func.isRequired,
};

export default InputDisplay;
