/** @format */
import { Link, useLocation } from "react-router-dom";

const Breadcrumbs = () => {
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
								{part.replace(/-/g, " ")}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
};

export default Breadcrumbs;
