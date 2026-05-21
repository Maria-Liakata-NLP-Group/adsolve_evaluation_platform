/** @format */

import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Breadcrumbs from "../components/breadcrumbs";
import ContentSquare from "../components/contentSquare";
import { getRuns } from "../api/runs";

const createCardContent = (title, description, taskLabel) => (
  <div>
    <h3 className="subtitle is-capitalized has-text-weight-semibold">{title}</h3>
    <p className="tag is-info is-light mb-2">{taskLabel}</p>
    {description && <p className="mt-2"><i>{description}</i></p>}
  </div>
);

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
        {useCaseLabel ?? "Tasks"}
      </h1>
      <p style={{ fontFamily: '"Raleway", sans-serif', fontSize: "0.9rem", color: "#888", marginBottom: "1.75rem" }}>
        Select a task to view evaluation results
      </p>
      <div className="section-label">Available tasks</div>
      <div className="fixed-grid has-4-cols has-2-cols-mobile">
        <div className="grid">
          {runs.map((run) => (
            <ContentSquare
              key={run.path_id}
              content={createCardContent(run.title, run.description, run.task_label)}
              onClick={() => navigate(`/use-cases/${useCaseId}/${run.path_id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Tasks;
