/** @format */

// import { useState, useEffect } from 'react';
import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import Dashboard from "./pages/dashboard";
import DiagramNavigation from "./pages/diagramNavigation";
import UseCases from "./pages/useCases";
import UseCaseExamples from "./pages/useCaseExamples";
import IntrinsicMetrics from "./pages/intrinsicMetrics";
import CreateNew from "./pages/createNew";
import "./style.scss";

const App = () => (
	<div className="is-flex is-justify-content-center">
		<div style={{ width: "100%", maxWidth: "1400px" }}>
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
					path="/use-cases"
					element={<UseCases />}
				/>
				<Route
					path="/use-cases/:useCase"
					element={<UseCaseExamples />}
				/>
				<Route
					path="/diagram"
					element={<DiagramNavigation />}
				/>
				<Route
					path="/use-cases/:useCase/:task"
					element={<Dashboard />}
				/>
				<Route
					path="/create-new-task"
					element={<CreateNew />}
				/>
			</Routes>
		</div>
	</div>
);

export default App;
