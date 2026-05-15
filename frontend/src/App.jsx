/** @format */

import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import Dashboard from "./pages/dashboard";
import UseCases from "./pages/useCases";
import UseCaseExamples from "./pages/useCaseExamples";
import IntrinsicMetrics from "./pages/intrinsicMetrics";
import CreateNew from "./pages/createNew";
import "./style.scss";

const App = () => (
  <div className="is-flex is-justify-content-center">
    <div style={{ width: "100%", maxWidth: "1400px" }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/intrinsic-metrics" element={<IntrinsicMetrics />} />
        <Route path="/use-cases" element={<UseCases />} />
        <Route path="/use-cases/:useCaseId" element={<UseCaseExamples />} />
        <Route path="/use-cases/tasks/:pathId" element={<Dashboard />} />
        <Route path="/evaluation-script-builder" element={<CreateNew />} />
      </Routes>
    </div>
  </div>
);

export default App;
