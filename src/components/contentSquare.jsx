/** @format */
import PropTypes from "prop-types";
const ContentSquare = ({ content, onClick }) => {
	return (
		<div className="cell p-2">
			<div
				className="box has-border 
                            is-square 
                            is-flex 
                            is-justify-content-center 
                            is-align-items-center"
				onClick={() => onClick()}
			>
				{content}
			</div>
		</div>
	);
};

ContentSquare.propTypes = {
	title: PropTypes.string,
	content: PropTypes.string,
	onClick: PropTypes.func,
};

export default ContentSquare;
