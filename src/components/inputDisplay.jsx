/** @format */

// import { useState } from "react";
import PropTypes from "prop-types";

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
				<div className="is-flex is-flex-direction-column">
					{input.map((inp, index) => (
						<img
							src={inp}
							key={index}
						></img>
					))}
				</div>
			</div>
			<button
				className="modal-close is-large"
				aria-label="close"
				onClick={onClose}
			></button>
		</div>
	);
};

InputDisplay.propTypes = {
	input: PropTypes.arrayOf(PropTypes.string).isRequired,
	active: PropTypes.bool,
	onClose: PropTypes.func.isRequired,
};

export default InputDisplay;
