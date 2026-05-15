/** @format */

import { useCallback, useEffect, useMemo, useState } from "react";
import AspectPopup from "../components/aspectPopup";
import Breadcrumbs from "../components/breadcrumbs";
import { getPath } from "../api/config";
import { usePathConfig } from "../hooks/usePathConfig";

const getAvailableTaskIds = (useCaseId, paths) => {
  const seen = new Set();
  return (paths || [])
    .filter((p) => p.use_case_id === useCaseId)
    .reduce((acc, p) => {
      if (!seen.has(p.task_id)) {
        seen.add(p.task_id);
        acc.push(p.task_id);
      }
      return acc;
    }, []);
};

const getAvailableDataSources = (useCaseId, taskId, paths) =>
  (paths || [])
    .filter((p) => p.use_case_id === useCaseId && p.task_id === taskId)
    .map((p) => ({ id: p.data_source_id, label: p.data_source_label, pathId: p.id }));

const getAspectCards = (pathConfig) => {
  if (!pathConfig?.aspects) return [];
  return [...pathConfig.aspects].sort((a, b) => a.sort_order - b.sort_order);
};

const getDefaultInfraSelection = (infrastructure) => ({
  compute_environment:
    infrastructure?.compute_environment?.options?.map((o) => o.id) ?? [],
  reference_mode:
    infrastructure?.reference_mode?.options?.map((o) => o.id) ?? [],
});

const getMetricIdsForAspect = ({ pathConfig, aspectId, selectedCompute, selectedReference }) => {
  const aspect = pathConfig?.aspects?.find((a) => a.id === aspectId);
  if (!aspect) return [];
  return aspect.metrics
    .filter((metric) => {
      const computeOk =
        metric.supported_compute_environments.length === 0 ||
        selectedCompute.some((c) => metric.supported_compute_environments.includes(c));
      const refOk =
        metric.supported_reference_modes.length === 0 ||
        selectedReference.some((r) => metric.supported_reference_modes.includes(r));
      return computeOk && refOk;
    })
    .map((m) => m.id);
};

const renderExamplesContent = (data) => {
  if (!data) return <p>No examples available yet.</p>;
  return (
    <div className="content">
      {data.original_posts?.length > 0 && (
        <>
          <h4>Original posts</h4>
          <ul>
            {data.original_posts.map((post, index) => (
              <li key={`${post}-${index}`}>{post}</li>
            ))}
          </ul>
        </>
      )}
      {data.good_summary && (
        <>
          <h4>Good summary</h4>
          <p>{data.good_summary}</p>
        </>
      )}
      {data.why_good && (
        <>
          <h4>Why this is good</h4>
          <p>{data.why_good}</p>
        </>
      )}
      {data.bad_summary && (
        <>
          <h4>Bad summary</h4>
          <p>{data.bad_summary}</p>
        </>
      )}
      {data.why_bad && (
        <>
          <h4>Why this is bad</h4>
          <p>{data.why_bad}</p>
        </>
      )}
    </div>
  );
};

const renderStakeholderRequirementsContent = (data) => {
  if (!data?.items?.length) return <p>No stakeholder requirements available yet.</p>;
  return (
    <div className="content">
      <ul>
        {data.items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

const renderMetricsContent = (metricIds, pathConfig, aspectId) => {
  if (!metricIds.length) return <p>No metrics available for this configuration yet.</p>;
  const aspect = pathConfig?.aspects?.find((a) => a.id === aspectId);
  const metricsInAspect = aspect?.metrics ?? [];
  return (
    <div>
      {metricIds.map((metricId) => {
        const metric = metricsInAspect.find((m) => m.id === metricId);
        return (
          <div key={metricId} className="box">
            <h4 className="title is-6 mb-2">{metric?.label ?? metricId}</h4>
            {metric?.tags?.length > 0 && (
              <div className="tags mb-3">
                {metric.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}
            <p>{metric?.description ?? "No description available."}</p>
          </div>
        );
      })}
    </div>
  );
};

const CreateNew = () => {
  const { useCases, paths, infrastructure, loading, error: configError } = usePathConfig();

  const [selectedUseCaseId, setSelectedUseCaseId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedDataSourceId, setSelectedDataSourceId] = useState("");
  const [selectedAspects, setSelectedAspects] = useState([]);
  const [selectedInfra, setSelectedInfra] = useState({ compute_environment: [], reference_mode: [] });

  const [pathConfig, setPathConfig] = useState(null);
  const [pathConfigLoading, setPathConfigLoading] = useState(false);

  const [activePopup, setActivePopup] = useState(null);
  const [activeAspectId, setActiveAspectId] = useState("");

  // Initialise infra selection once infrastructure config is loaded
  useEffect(() => {
    if (infrastructure) {
      setSelectedInfra(getDefaultInfraSelection(infrastructure));
    }
  }, [infrastructure]);

  const availableTaskIds = useMemo(
    () => getAvailableTaskIds(selectedUseCaseId, paths),
    [selectedUseCaseId, paths]
  );

  const availableDataSources = useMemo(
    () => getAvailableDataSources(selectedUseCaseId, selectedTaskId, paths),
    [selectedUseCaseId, selectedTaskId, paths]
  );

  const aspectCards = useMemo(() => getAspectCards(pathConfig), [pathConfig]);

  const canShowTasks = !!selectedUseCaseId && !loading;
  const canShowDataSources = canShowTasks && !!selectedTaskId;
  const canShowInfrastructure = canShowDataSources && !!selectedDataSourceId;
  const canShowAspects = canShowInfrastructure && !!pathConfig && !pathConfigLoading;

  const hasTaskData = availableTaskIds.length > 0;
  const hasDataSourceData = availableDataSources.length > 0;
  const hasAspectData = aspectCards.length > 0;

  const isInfraComplete =
    selectedInfra.compute_environment.length > 0 &&
    selectedInfra.reference_mode.length > 0;

  const canGenerate =
    !!selectedUseCaseId &&
    !!selectedTaskId &&
    !!selectedDataSourceId &&
    isInfraComplete &&
    selectedAspects.length > 0;

  const activeAspectData = useMemo(() => {
    if (!pathConfig || !activeAspectId) return null;
    return pathConfig?.aspects?.find((a) => a.id === activeAspectId) ?? null;
  }, [pathConfig, activeAspectId]);

  const activeMetricIds = useMemo(() => {
    if (!activeAspectId || !isInfraComplete || !pathConfig) return [];
    return getMetricIdsForAspect({
      pathConfig,
      aspectId: activeAspectId,
      selectedCompute: selectedInfra.compute_environment,
      selectedReference: selectedInfra.reference_mode,
    });
  }, [activeAspectId, isInfraComplete, pathConfig, selectedInfra]);

  const popupTitle = useMemo(() => {
    if (!activePopup || !activeAspectId) return "";
    const aspectLabel = activeAspectData?.label ?? activeAspectId;
    if (activePopup === "examples") return `${aspectLabel} — Examples`;
    if (activePopup === "stakeholder_requirements") return `${aspectLabel} — Stakeholder Requirements`;
    if (activePopup === "metrics") return `${aspectLabel} — Metrics`;
    return aspectLabel;
  }, [activePopup, activeAspectId, activeAspectData]);

  const popupContent = useMemo(() => {
    if (!activePopup || !activeAspectId || !activeAspectData) return null;
    if (activePopup === "examples") return renderExamplesContent(activeAspectData.examples);
    if (activePopup === "stakeholder_requirements")
      return renderStakeholderRequirementsContent(activeAspectData.stakeholder_requirements);
    if (activePopup === "metrics")
      return renderMetricsContent(activeMetricIds, pathConfig, activeAspectId);
    return null;
  }, [activePopup, activeAspectId, activeAspectData, activeMetricIds, pathConfig]);

  const closePopup = useCallback(() => {
    setActivePopup(null);
    setActiveAspectId("");
  }, []);

  const resetDownstreamState = useCallback(() => {
    setSelectedDataSourceId("");
    setSelectedAspects([]);
    setSelectedInfra(getDefaultInfraSelection(infrastructure));
    setPathConfig(null);
    closePopup();
  }, [closePopup, infrastructure]);

  const onSelectUseCase = (useCaseId) => {
    setSelectedUseCaseId(useCaseId);
    setSelectedTaskId("");
    resetDownstreamState();
  };

  const onSelectTask = (taskId) => {
    setSelectedTaskId(taskId);
    resetDownstreamState();
  };

  // Fetch path config from API when the user selects a data source
  const onSelectDataSource = useCallback(
    async (dataSourceId, pathId) => {
      setSelectedDataSourceId(dataSourceId);
      setSelectedAspects([]);
      setSelectedInfra(getDefaultInfraSelection(infrastructure));
      closePopup();
      setPathConfigLoading(true);
      try {
        const config = await getPath(pathId);
        setPathConfig(config);
      } catch {
        setPathConfig(null);
      } finally {
        setPathConfigLoading(false);
      }
    },
    [closePopup, infrastructure]
  );

  const onToggleInfraOption = (groupId, optionId) => {
    setSelectedInfra((prev) => {
      const current = prev[groupId] ?? [];
      const isSelected = current.includes(optionId);
      return {
        ...prev,
        [groupId]: isSelected ? current.filter((id) => id !== optionId) : [...current, optionId],
      };
    });
  };

  const toggleAspect = (aspectId) => {
    setSelectedAspects((prev) =>
      prev.includes(aspectId) ? prev.filter((id) => id !== aspectId) : [...prev, aspectId]
    );
  };

  const openPopup = (aspectId, popupType) => {
    setActiveAspectId(aspectId);
    setActivePopup(popupType);
  };

  const onGenerate = () => {
    const useCase = useCases.find((uc) => uc.id === selectedUseCaseId);
    const dataSource = availableDataSources.find((ds) => ds.id === selectedDataSourceId);
    const taskLabel =
      paths.find(
        (p) => p.use_case_id === selectedUseCaseId && p.task_id === selectedTaskId
      )?.task_label ?? selectedTaskId;

    // eslint-disable-next-line no-alert
    alert(
      [
        `Use Case: ${useCase?.label ?? selectedUseCaseId}`,
        `Task: ${taskLabel}`,
        `Data Source: ${dataSource?.label ?? selectedDataSourceId}`,
        `Compute: ${selectedInfra.compute_environment.join(", ")}`,
        `Reference Mode: ${selectedInfra.reference_mode.join(", ")}`,
        `Aspects: ${selectedAspects.join(", ")}`,
      ].join("\n")
    );
  };

  if (configError) return <div>Error loading config: {configError}</div>;
  if (loading) return <div>Loading…</div>;

  return (
    <div className="container is-max-desktop">
      <Breadcrumbs />
      <section className="section pb-4">
        <h1 className="title is-4">Evaluation Script Builder</h1>
        <p className="subtitle is-6">
          Build an evaluation configuration bottom-up: use case → task → data source → infrastructure → aspects.
        </p>
      </section>

      <section className="section pt-0">
        <h2 className="title is-6 mb-3">USE CASE</h2>
        <div className="buttons">
          {useCases.map((useCase) => (
            <button
              key={useCase.id}
              type="button"
              className={`button ${selectedUseCaseId === useCase.id ? "is-link" : "is-light"}`}
              onClick={() => onSelectUseCase(useCase.id)}
            >
              {useCase.label}
            </button>
          ))}
        </div>
      </section>

      {canShowTasks && (
        <section className="section pt-0">
          <h2 className="title is-6 mb-3">TASK</h2>
          {hasTaskData ? (
            <div className="buttons">
              {availableTaskIds.map((taskId) => {
                const taskLabel =
                  paths.find(
                    (p) => p.use_case_id === selectedUseCaseId && p.task_id === taskId
                  )?.task_label ?? taskId;
                return (
                  <button
                    key={taskId}
                    type="button"
                    className={`button ${selectedTaskId === taskId ? "is-link" : "is-light"}`}
                    onClick={() => onSelectTask(taskId)}
                  >
                    {taskLabel}
                  </button>
                );
              })}
            </div>
          ) : (
            <article className="message is-warning">
              <div className="message-body">No data available for this USE CASE yet.</div>
            </article>
          )}
        </section>
      )}

      {canShowDataSources && (
        <section className="section pt-0">
          <h2 className="title is-6 mb-3">DATA SOURCE</h2>
          {hasDataSourceData ? (
            <div className="buttons">
              {availableDataSources.map((dataSource) => (
                <button
                  key={dataSource.id}
                  type="button"
                  className={`button ${selectedDataSourceId === dataSource.id ? "is-link" : "is-light"}`}
                  onClick={() => onSelectDataSource(dataSource.id, dataSource.pathId)}
                >
                  {dataSource.label}
                </button>
              ))}
            </div>
          ) : (
            <article className="message is-warning">
              <div className="message-body">No data available for this TASK yet.</div>
            </article>
          )}
        </section>
      )}

      {canShowInfrastructure && (
        <section className="section pt-0">
          <h2 className="title is-6 mb-3">INFRASTRUCTURE CONSTRAINTS</h2>
          <p className="content mb-2">Filter metrics based on your infrastructure requirements.</p>

          <div className="mb-5">
            <p className="content is-small mb-2">
              {infrastructure?.compute_environment?.label ?? "Compute environment"}
            </p>
            <div className="buttons">
              {(infrastructure?.compute_environment?.options ?? []).map((option) => {
                const checked = selectedInfra.compute_environment.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={`checkbox ${checked ? "is-link" : "is-light"}`}
                  >
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={checked}
                      onChange={() => onToggleInfraOption("compute_environment", option.id)}
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <p className="content is-small mb-2">
              {infrastructure?.reference_mode?.label ?? "References"}
            </p>
            <div className="buttons">
              {(infrastructure?.reference_mode?.options ?? []).map((option) => {
                const checked = selectedInfra.reference_mode.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={`checkbox ${checked ? "is-link" : "is-light"}`}
                  >
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={checked}
                      onChange={() => onToggleInfraOption("reference_mode", option.id)}
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {pathConfigLoading && (
        <section className="section pt-0">
          <p>Loading aspects…</p>
        </section>
      )}

      {canShowAspects && (
        <section className="section pt-0">
          <div className="has-text-centered mb-5">
            <h2 className="title is-5 mb-2">WHAT DO YOU WANT TO EVALUATE?</h2>
            <p className="subtitle is-6">Aspects are sociotechnical interpretations of real-world needs</p>
          </div>

          {hasAspectData ? (
            <div className="columns is-multiline is-centered">
              {aspectCards.map((aspect) => {
                const isSelected = selectedAspects.includes(aspect.id);
                return (
                  <div key={aspect.id} className="column is-6">
                    <div className="card">
                      <div className="card-content">
                        <label className="checkbox is-flex is-align-items-center mb-3">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={isSelected}
                            onChange={() => toggleAspect(aspect.id)}
                          />
                          <strong>{aspect.label}</strong>
                        </label>
                        <p>{aspect.definition}</p>
                        <div className="buttons mt-3">
                          <button
                            type="button"
                            className="button is-small is-info is-light"
                            onClick={() => openPopup(aspect.id, "examples")}
                          >
                            Examples
                          </button>
                          <button
                            type="button"
                            className="button is-small is-warning is-light"
                            onClick={() => openPopup(aspect.id, "stakeholder_requirements")}
                          >
                            Stakeholder Requirements
                          </button>
                          <button
                            type="button"
                            className="button is-small is-success is-light"
                            onClick={() => openPopup(aspect.id, "metrics")}
                          >
                            Metrics
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <article className="message is-warning">
              <div className="message-body">No aspects available for this DATA SOURCE yet.</div>
            </article>
          )}
        </section>
      )}

      <section className="section pt-0">
        <button
          type="button"
          className="button is-primary is-large"
          disabled={!canGenerate}
          onClick={onGenerate}
        >
          Generate evaluation script
        </button>
      </section>

      <AspectPopup
        isOpen={!!activePopup && !!activeAspectId}
        title={popupTitle}
        onClose={closePopup}
      >
        {popupContent}
      </AspectPopup>
    </div>
  );
};

export default CreateNew;
