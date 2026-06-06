/** @format */

import { Routes, Route, useLocation } from "react-router-dom";
import { AdminProvider } from "./hooks/useAdmin";
import AppHeader from "./components/navigation_and_controls/AppHeader";
import Home from "./pages/home";
import Dashboard from "./pages/dashboard";
import RunExplorer from "./pages/runExplorer";
import IntrinsicMetrics from "./pages/intrinsicMetrics";
import Library from "./pages/library";
import "./style.scss";

const App = () => {
	const location = useLocation();
	const isHome = location.pathname === "/";
	const isRuns = location.pathname === "/runs";

	return (
		<AdminProvider>
			{!isHome && <AppHeader />}
			<div
				style={
					isRuns
						? {
								maxWidth: "1400px",
								margin: "0 auto",
								width: "100%",
								padding: "0 2rem",
							}
						: {}
				}
			>
				<Routes>
					<Route
						path="/"
						element={<Home />}
					/>
					<Route
						path="/intrinsic-metrics"
						element={<IntrinsicMetrics />}
					/>
					<Route
						path="/runs"
						element={<RunExplorer />}
					/>
					<Route
						path="/use-cases/:useCaseId/:pathId/:runId"
						element={<Dashboard />}
					/>
					<Route
						path="/library"
						element={<Library />}
					/>
				</Routes>
			</div>
		</AdminProvider>
	);
};

export default App;
