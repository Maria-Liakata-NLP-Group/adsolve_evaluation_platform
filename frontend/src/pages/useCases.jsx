/** @format */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "../components/breadcrumbs";
import ContentSquare from "../components/contentSquare";
import { getUseCases } from "../api/config";

const UseCases = () => {
  const navigate = useNavigate();
  const [useCases, setUseCases] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getUseCases()
      .then(setUseCases)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <Breadcrumbs />
      <h1 className="title">Select a use case!</h1>
      <section className="block">
        <div className="m-5"></div>
        <div className="fixed-grid has-4-cols has-2-cols-mobile">
          <div className="grid">
            {useCases.map((useCase) => (
              <ContentSquare
                key={useCase.id}
                content={
                  <h1 className="title has-text-centered is-capitalized">
                    {useCase.label}
                  </h1>
                }
                onClick={() => navigate(`/use-cases/${useCase.id}`, { state: { useCaseLabel: useCase.label } })}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default UseCases;
