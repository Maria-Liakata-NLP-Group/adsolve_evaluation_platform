/** @format */

import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Breadcrumbs from "../components/breadcrumbs";
import RunCard from "../components/RunCard";
import { getRuns } from "../api/runs";

const Tasks = () => {
  const { useCaseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState(null);
  const [useCaseLabel, setUseCaseLabel] = useState(location.state?.useCaseLabel ?? null);

  useEffect(() => {
    if (!useCaseId) return;
    getRuns(useCaseId)
      .then((data) => {
        setRuns(data);
        if (data[0]?.use_case_label) setUseCaseLabel(data[0].use_case_label);
      })
      .catch((err) => setError(err.message));
  }, [useCaseId]);

  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <Breadcrumbs labels={useCaseLabel ? { [useCaseId]: useCaseLabel } : {}} />
      <h1 style={{ fontFamily: '"Poppins", sans-serif', fontSize: "1.6rem", fontWeight: 700, color: "#151515", margin: "1.5rem 0 0.25rem" }}>
        {useCaseLabel ?? "Evaluation Runs"}
      </h1>
      <p style={{ fontFamily: '"Raleway", sans-serif', fontSize: "0.9rem", color: "#888", marginBottom: "1.75rem" }}>
        Select a run to view evaluation results
      </p>
      <div className="columns is-multiline">
        {runs.map((run) => (
          <div key={run.id} className="column is-6">
            <RunCard
              run={run}
              onNavigate={() => navigate(`/use-cases/${useCaseId}/${run.path_id}`)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tasks;
