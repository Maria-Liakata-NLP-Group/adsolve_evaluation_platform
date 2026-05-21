/** @format */

import { Routes, Route, useLocation } from "react-router-dom";
import AppHeader from "./components/AppHeader";
import Home from "./pages/home";
import Dashboard from "./pages/dashboard";
import UseCases from "./pages/useCases";
import Tasks from "./pages/tasks";
import IntrinsicMetrics from "./pages/intrinsicMetrics";
import CreateNew from "./pages/createNew";
import "./style.scss";

const App = () => {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <>
      {!isHome && <AppHeader />}
      <div style={!isHome ? { maxWidth: "1400px", margin: "0 auto", width: "100%", padding: "0 2rem" } : {}}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/intrinsic-metrics" element={<IntrinsicMetrics />} />
          <Route path="/use-cases" element={<UseCases />} />
          <Route path="/use-cases/:useCaseId" element={<Tasks />} />
          <Route path="/use-cases/:useCaseId/:pathId" element={<Dashboard />} />
          <Route path="/evaluation-script-builder" element={<CreateNew />} />
        </Routes>
      </div>
    </>
  );
};

export default App;
