/** @format */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Breadcrumbs from "../components/breadcrumbs";
import DocumentDisplay from "../components/documentDisplay";
import MetricsScatterPlot from "../components/metricsScatterPlot";
import { getDashboard, getDocument, getRunByPath } from "../api/runs";

const buildChartData = (dashData, byDataset, currentId, datasets, models) => {
  const result = {};

  for (const { metric_id, display_label } of dashData.metrics) {
    const relevantScores = dashData.scores.filter(
      (s) =>
        s.metric_id === metric_id &&
        (byDataset ? s.dataset_id === currentId : s.model_id === currentId)
    );

    result[metric_id] = {
      metric: display_label,
      means: relevantScores.map((s) => s.mean_score),
      tags: relevantScores.map((s) =>
        byDataset
          ? models.find((m) => m.id === s.model_id)?.name ?? String(s.model_id)
          : datasets.find((d) => d.id === s.dataset_id)?.name ?? String(s.dataset_id)
      ),
      dataPoints: relevantScores.map((s) => s.document_scores.map((d) => d.score)),
      documentIds: relevantScores.map((s) => s.document_scores.map((d) => d.doc_id)),
    };
  }

  return result;
};

const Dashboard = () => {
  const { useCaseId, pathId } = useParams();
  const [run, setRun] = useState(null);
  const [currentDatasetId, setCurrentDatasetId] = useState(null);
  const [currentModelId, setCurrentModelId] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [chartData, setChartData] = useState({});
  const [modalDetails, setModalDetails] = useState(null);
  const [error, setError] = useState(null);

  // Fetch run metadata once when pathId changes
  useEffect(() => {
    if (!pathId) return;
    getRunByPath(pathId)
      .then((r) => {
        setRun(r);
        if (r.datasets.length > 0) setCurrentDatasetId(r.datasets[0].id);
      })
      .catch((err) => setError(err.message));
  }, [pathId]);

  // Fetch dashboard data when run or active filter changes
  useEffect(() => {
    if (!run) return;
    const filter =
      currentDatasetId != null
        ? { datasetId: currentDatasetId }
        : currentModelId != null
        ? { modelId: currentModelId }
        : {};

    getDashboard(run.id, filter)
      .then(setDashData)
      .catch((err) => setError(err.message));
  }, [run, currentDatasetId, currentModelId]);

  // Derive chart-ready data from raw dashboard response
  useEffect(() => {
    if (!dashData || !run) return;
    const byDataset = currentDatasetId != null;
    const currentId = byDataset ? currentDatasetId : currentModelId;
    setChartData(buildChartData(dashData, byDataset, currentId, run.datasets, run.models));
  }, [dashData, run, currentDatasetId, currentModelId]);

  // Lazily fetch document detail on scatter-plot point click
  const handleShowDetails = useCallback(
    async ({ docId, tag, metricId, value }) => {
      if (!run) return;
      try {
        const doc = await getDocument(run.id, docId);
        const output = doc.outputs.find((o) => o.model === tag);
        const sentDetail = output?.scores?.[metricId]?.sentence_detail;
        setModalDetails({
          gold: doc.gold_summary,
          llm_sents: sentDetail ? sentDetail.sents : [output?.llm_summary ?? ""],
          llm_sent_scores: sentDetail ? sentDetail.scores : [],
          documentId: doc.external_id,
          highlightDocId: docId,
          tag,
          aspect: metricId,
          value,
          input: doc.input ?? [],
        });
      } catch {
        // keep previous modal if fetch fails
      }
    },
    [run]
  );

  const clickOnDataset = (id) => {
    setCurrentDatasetId(id);
    setCurrentModelId(null);
  };

  const clickOnModel = (id) => {
    setCurrentModelId(id);
    setCurrentDatasetId(null);
  };

  if (error) return <div>Error: {error}</div>;
  if (!run) return <div>Loading…</div>;

  return (
    <>
      <div>
        <Breadcrumbs labels={{ [useCaseId]: run.use_case_label, [pathId]: run.title }} />
        <h1 className="title">{run.title}</h1>

        <section className="block">
          <div className="is-flex">
            <div className="is-flex is-align-items-center mr-5">
              <div style={{ width: "80px" }}>Datasets:</div>
              <div className="tabs is-toggle">
                <ul>
                  {run.datasets.map((dataset) => (
                    <li
                      key={dataset.id}
                      className={currentDatasetId === dataset.id ? "is-active" : ""}
                      onClick={() => clickOnDataset(dataset.id)}
                    >
                      <a><span>{dataset.name}</span></a>
                    </li>
                  ))}
                </ul>
              </div>
              <button className="button dark ml-2 is-small">Add dataset</button>
            </div>

            <div className="is-flex is-align-items-center">
              <div style={{ width: "80px" }}>Models:</div>
              <div className="tabs is-toggle">
                <ul>
                  {run.models.map((model) => (
                    <li
                      key={model.id}
                      className={currentModelId === model.id ? "is-active" : ""}
                      onClick={() => clickOnModel(model.id)}
                    >
                      <a><span>{model.name}</span></a>
                    </li>
                  ))}
                </ul>
              </div>
              <button className="button ml-2 is-small">Add model</button>
            </div>
          </div>
        </section>

        <section className="block">
          <div className="is-flex">
            <div>
              {Object.entries(chartData).map(
                ([metricId, { metric, means, tags, dataPoints, documentIds }], index) => (
                  <MetricsScatterPlot
                    key={index}
                    dataPoints={dataPoints}
                    documentIds={documentIds}
                    highlightedId={modalDetails?.highlightDocId}
                    highlightedTag={modalDetails?.tag}
                    showDetails={handleShowDetails}
                    aspect={metricId}
                    metric={metric}
                    means={means}
                    tags={tags}
                  />
                )
              )}
            </div>
            <div>
              <DocumentDisplay
                gold={modalDetails?.gold}
                llm={modalDetails?.llm_sents}
                input={modalDetails?.input}
                documentScore={modalDetails?.value}
                scores={modalDetails?.llm_sent_scores}
                tag={modalDetails?.tag}
                documentId={modalDetails?.documentId}
                aspect={modalDetails?.aspect}
              />
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Dashboard;
