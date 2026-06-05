/** @format */
import { Link, useLocation } from "react-router-dom";
import PropTypes from "prop-types";

// labels: optional map of URL segment → display text, e.g. { "mental_health": "AI for Mental Health" }
const Breadcrumbs = ({ labels = {} }) => {
	const location = useLocation();
	const parts = location.pathname.split("/").filter(Boolean);

	return (
		<nav
			className="breadcrumb mb-2"
			aria-label="breadcrumbs"
		>
			<ul>
				<li>
					<Link to="/">Home</Link>
				</li>
				{parts.map((part, idx) => {
					const path = "/" + parts.slice(0, idx + 1).join("/");
					const isLast = idx === parts.length - 1;
					// either use label from props, or prettify the URL segment by removing dashes and underscores and capitalizing words
					const display =
						labels[part] ??
						part.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

					return (
						<li
							key={path}
							className={isLast ? "is-active" : undefined}
							aria-current={isLast ? "page" : undefined}
						>
							<Link
								to={path}
								className={isLast ? "has-text-dark" : undefined}
							>
								{display}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
};

export default Breadcrumbs;

// props validation
Breadcrumbs.propTypes = {
	labels: PropTypes.objectOf(PropTypes.string),
};

Breadcrumbs.defaultProps = {
	labels: {},
};
