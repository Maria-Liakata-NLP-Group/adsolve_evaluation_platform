/** @format */

import { useCallback, useEffect, useMemo, useState } from "react";
import PathAspectCard from "../components/PathAspectCard";
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

// Filter an aspect's metrics by the current infra selection
const getFilteredMetrics = (aspect, selectedCompute, selectedReference) =>
  (aspect.metrics ?? []).filter((metric) => {
    const computeOk =
      metric.supported_compute_environments.length === 0 ||
      selectedCompute.some((c) => metric.supported_compute_environments.includes(c));
    const refOk =
      metric.supported_reference_modes.length === 0 ||
      selectedReference.some((r) => metric.supported_reference_modes.includes(r));
    return computeOk && refOk;
  });

const CreateNew = () => {
  const { useCases, paths, infrastructure, loading, error: configError } = usePathConfig();

  const [selectedUseCaseId, setSelectedUseCaseId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedDataSourceId, setSelectedDataSourceId] = useState("");
  const [selectedAspects, setSelectedAspects] = useState([]);
  const [selectedInfra, setSelectedInfra] = useState({ compute_environment: [], reference_mode: [] });

  const [pathConfig, setPathConfig] = useState(null);
  const [pathConfigLoading, setPathConfigLoading] = useState(false);

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

  const resetDownstreamState = useCallback(() => {
    setSelectedDataSourceId("");
    setSelectedAspects([]);
    setSelectedInfra(getDefaultInfraSelection(infrastructure));
    setPathConfig(null);
  }, [infrastructure]);

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
    [infrastructure]
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
                const filteredMetrics = getFilteredMetrics(
                  aspect,
                  selectedInfra.compute_environment,
                  selectedInfra.reference_mode
                );
                return (
                  <div key={aspect.id} className="column is-6">
                    <PathAspectCard
                      label={aspect.label}
                      examples={aspect.examples}
                      stakeholderRequirements={aspect.stakeholder_requirements}
                      metrics={filteredMetrics}
                    >
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
                    </PathAspectCard>
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
    </div>
  );
};

export default CreateNew;
