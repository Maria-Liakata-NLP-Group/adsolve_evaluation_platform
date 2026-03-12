/** @format */

import { useMemo, useState } from "react";
import AspectPopup from "../components/aspectPopup";
import {
	USE_CASES,
	TASKS,
	INFRASTRUCTURE,
	ASPECTS,
	METRICS,
	TASKS_BY_USE_CASE,
	PATH_INDEX,
	PATHS_BY_ID,
} from "../data/script_builder";

const getPathId = (useCaseId, taskId, dataSourceId) => {
	if (!useCaseId || !taskId || !dataSourceId) return "";
	return `${useCaseId}_${taskId}_${dataSourceId}`;
};

const getAvailableTaskIds = (useCaseId) => {
	if (!useCaseId) return [];
	return TASKS_BY_USE_CASE?.[useCaseId] ?? [];
};

const getPathConfig = (useCaseId, taskId, dataSourceId) => {
	const pathId = getPathId(useCaseId, taskId, dataSourceId);
	return PATHS_BY_ID?.[pathId] ?? null;
};

const getAvailableDataSources = (useCaseId, taskId) => {
	if (!useCaseId || !taskId) return [];

	const seen = new Set();

	return (PATH_INDEX?.paths ?? [])
		.filter((path) => path.use_case === useCaseId && path.task === taskId)
		.map((path) => ({
			id: path.data_source,
			label: path.data_source_label ?? path.data_source,
		}))
		.filter((item) => {
			if (seen.has(item.id)) return false;
			seen.add(item.id);
			return true;
		});
};

const getAspectCards = (pathConfig) => {
	if (!pathConfig?.aspects) return [];

	return Object.entries(pathConfig.aspects)
		.map(([aspectId, aspectData]) => ({
			id: aspectId,
			label: ASPECTS?.[aspectId]?.label ?? aspectId,
			definition: aspectData?.definition ?? "",
			order: aspectData?.order ?? 999,
		}))
		.sort((a, b) => a.order - b.order);
};

const getDefaultInfraSelection = () => ({
	compute_environment: INFRASTRUCTURE?.compute_environment?.options ?? [],
	reference_mode: INFRASTRUCTURE?.reference_mode?.options ?? [],
});

const metricSupportsInfrastructure = ({
	metric,
	selectedCompute,
	selectedReference,
}) => {
	if (!metric) return false;

	const supportedCompute =
		metric.supported_infrastructure?.compute_environment ?? [];
	const supportedReference =
		metric.supported_infrastructure?.reference_mode ?? [];

	const computeOk =
		supportedCompute.length === 0 ||
		selectedCompute.some((value) => supportedCompute.includes(value));

	const referenceOk =
		supportedReference.length === 0 ||
		selectedReference.some((value) => supportedReference.includes(value));

	return computeOk && referenceOk;
};

const getMetricIdsForAspect = ({
	pathConfig,
	aspectId,
	selectedCompute,
	selectedReference,
}) => {
	const metricIds = pathConfig?.aspects?.[aspectId]?.metrics ?? [];

	if (!Array.isArray(metricIds)) return [];

	return metricIds.filter((metricId) =>
		metricSupportsInfrastructure({
			metric: METRICS?.[metricId],
			selectedCompute,
			selectedReference,
		}),
	);
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
	if (!data?.items?.length) {
		return <p>No stakeholder requirements available yet.</p>;
	}

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

const renderMetricsContent = (metricIds) => {
	if (!metricIds.length) {
		return <p>No metrics available for this configuration yet.</p>;
	}

	return (
		<div>
			{metricIds.map((metricId) => {
				const metric = METRICS?.[metricId];

				return (
					<div
						key={metricId}
						className="box"
					>
						<h4 className="title is-6 mb-2">
							{metric?.label ?? `Unknown metric: ${metricId}`}
						</h4>

						{metric?.tags?.length > 0 && (
							<div className="tags mb-3">
								{metric.tags.map((tag) => (
									<span
										key={tag}
										className="tag"
									>
										{tag}
									</span>
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
	const [selectedUseCaseId, setSelectedUseCaseId] = useState("");
	const [selectedTaskId, setSelectedTaskId] = useState("");
	const [selectedDataSourceId, setSelectedDataSourceId] = useState("");
	const [selectedAspects, setSelectedAspects] = useState([]);
	const [selectedInfra, setSelectedInfra] = useState(getDefaultInfraSelection);

	const [activePopup, setActivePopup] = useState(null);
	const [activeAspectId, setActiveAspectId] = useState("");

	const availableTaskIds = useMemo(
		() => getAvailableTaskIds(selectedUseCaseId),
		[selectedUseCaseId],
	);

	const availableDataSources = useMemo(
		() => getAvailableDataSources(selectedUseCaseId, selectedTaskId),
		[selectedUseCaseId, selectedTaskId],
	);

	const pathConfig = useMemo(
		() =>
			getPathConfig(selectedUseCaseId, selectedTaskId, selectedDataSourceId),
		[selectedUseCaseId, selectedTaskId, selectedDataSourceId],
	);

	const aspectCards = useMemo(() => getAspectCards(pathConfig), [pathConfig]);

	const canShowTasks = !!selectedUseCaseId;
	const canShowDataSources = !!selectedUseCaseId && !!selectedTaskId;
	const canShowInfrastructure =
		!!selectedUseCaseId && !!selectedTaskId && !!selectedDataSourceId;
	const canShowAspects = canShowInfrastructure && !!pathConfig;

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
		return pathConfig?.aspects?.[activeAspectId] ?? null;
	}, [pathConfig, activeAspectId]);

	const activeMetricIds = useMemo(() => {
		if (!activeAspectId || !isInfraComplete || !pathConfig) return [];

		return getMetricIdsForAspect({
			pathConfig,
			aspectId: activeAspectId,
			selectedCompute: selectedInfra.compute_environment,
			selectedReference: selectedInfra.reference_mode,
		});
	}, [
		activeAspectId,
		isInfraComplete,
		pathConfig,
		selectedInfra.compute_environment,
		selectedInfra.reference_mode,
	]);

	const popupTitle = useMemo(() => {
		if (!activePopup || !activeAspectId) return "";

		const aspectLabel = ASPECTS?.[activeAspectId]?.label ?? activeAspectId;

		if (activePopup === "examples") return `${aspectLabel} — Examples`;
		if (activePopup === "stakeholder_requirements") {
			return `${aspectLabel} — Stakeholder Requirements`;
		}
		if (activePopup === "metrics") return `${aspectLabel} — Metrics`;

		return aspectLabel;
	}, [activePopup, activeAspectId]);

	const popupContent = useMemo(() => {
		if (!activePopup || !activeAspectId || !activeAspectData) return null;

		if (activePopup === "examples") {
			return renderExamplesContent(activeAspectData.examples);
		}

		if (activePopup === "stakeholder_requirements") {
			return renderStakeholderRequirementsContent(
				activeAspectData.stakeholder_requirements,
			);
		}

		if (activePopup === "metrics") {
			return renderMetricsContent(activeMetricIds);
		}

		return null;
	}, [activePopup, activeAspectId, activeAspectData, activeMetricIds]);

	const closePopup = () => {
		setActivePopup(null);
		setActiveAspectId("");
	};

	const resetDownstreamState = () => {
		setSelectedDataSourceId("");
		setSelectedAspects([]);
		setSelectedInfra(getDefaultInfraSelection());
		closePopup();
	};

	const onSelectUseCase = (useCaseId) => {
		setSelectedUseCaseId(useCaseId);
		setSelectedTaskId("");
		resetDownstreamState();
	};

	const onSelectTask = (taskId) => {
		setSelectedTaskId(taskId);
		resetDownstreamState();
	};

	const onSelectDataSource = (dataSourceId) => {
		setSelectedDataSourceId(dataSourceId);
		setSelectedAspects([]);
		setSelectedInfra(getDefaultInfraSelection());
		closePopup();
	};

	const onToggleInfraOption = (groupId, optionId) => {
		setSelectedInfra((prev) => {
			const current = prev[groupId] ?? [];
			const isSelected = current.includes(optionId);

			return {
				...prev,
				[groupId]: isSelected
					? current.filter((id) => id !== optionId)
					: [...current, optionId],
			};
		});
	};

	const toggleAspect = (aspectId) => {
		setSelectedAspects((prev) =>
			prev.includes(aspectId)
				? prev.filter((id) => id !== aspectId)
				: [...prev, aspectId],
		);
	};

	const openPopup = (aspectId, popupType) => {
		setActiveAspectId(aspectId);
		setActivePopup(popupType);
	};

	const onGenerate = () => {
		// eslint-disable-next-line no-alert
		alert(
			[
				`Use Case: ${USE_CASES?.[selectedUseCaseId]?.label ?? selectedUseCaseId}`,
				`Task: ${TASKS?.[selectedTaskId]?.label ?? selectedTaskId}`,
				`Data Source: ${
					availableDataSources.find((d) => d.id === selectedDataSourceId)
						?.label ?? selectedDataSourceId
				}`,
				`Compute: ${selectedInfra.compute_environment.join(", ")}`,
				`Reference Mode: ${selectedInfra.reference_mode.join(", ")}`,
				`Aspects: ${selectedAspects.join(", ")}`,
			].join("\n"),
		);
	};

	return (
		<div className="container is-max-desktop">
			<section className="section pb-4">
				<h1 className="title is-4">Evaluation Script Builder</h1>
				<p className="subtitle is-6">
					Build an evaluation configuration bottom-up: use case → task → data
					source → infrastructure → aspects.
				</p>
			</section>

			<section className="section pt-0">
				<h2 className="title is-6 mb-3">USE CASE</h2>
				<div className="buttons">
					{Object.entries(USE_CASES).map(([useCaseId, useCase]) => (
						<button
							key={useCaseId}
							type="button"
							className={`button ${
								selectedUseCaseId === useCaseId ? "is-link" : "is-light"
							}`}
							onClick={() => onSelectUseCase(useCaseId)}
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
							{availableTaskIds.map((taskId) => (
								<button
									key={taskId}
									type="button"
									className={`button ${
										selectedTaskId === taskId ? "is-link" : "is-light"
									}`}
									onClick={() => onSelectTask(taskId)}
								>
									{TASKS?.[taskId]?.label ?? taskId}
								</button>
							))}
						</div>
					) : (
						<article className="message is-warning">
							<div className="message-body">
								No data available for this USE CASE yet.
							</div>
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
									className={`button ${
										selectedDataSourceId === dataSource.id
											? "is-link"
											: "is-light"
									}`}
									onClick={() => onSelectDataSource(dataSource.id)}
								>
									{dataSource.label}
								</button>
							))}
						</div>
					) : (
						<article className="message is-warning">
							<div className="message-body">
								No data available for this TASK yet.
							</div>
						</article>
					)}
				</section>
			)}

			{canShowInfrastructure && (
				<section className="section pt-0">
					<h2 className="title is-6 mb-3">INFRASTRUCTURE CONSTRAINTS</h2>
					<p className="content mb-2">
						Filter metrics based on your infrastructure requirements.
					</p>

					<div className="mb-5">
						<p className="content is-small mb-2">
							{INFRASTRUCTURE?.compute_environment?.label ??
								"Compute environment"}
						</p>
						<div className="buttons">
							{(INFRASTRUCTURE?.compute_environment?.options ?? []).map(
								(optionId) => {
									const option = INFRASTRUCTURE?.option_definitions?.[optionId];
									const checked =
										selectedInfra.compute_environment.includes(optionId);

									return (
										<label
											key={optionId}
											className={`checkbox ${checked ? "is-link" : "is-light"}`}
										>
											<input
												type="checkbox"
												className="mr-2"
												checked={checked}
												onChange={() =>
													onToggleInfraOption("compute_environment", optionId)
												}
											/>
											{option?.label ?? optionId}
										</label>
									);
								},
							)}
						</div>
					</div>

					<div>
						<p className="content is-small mb-2">
							{INFRASTRUCTURE?.reference_mode?.label ?? "References"}
						</p>
						<div className="buttons">
							{(INFRASTRUCTURE?.reference_mode?.options ?? []).map(
								(optionId) => {
									const option = INFRASTRUCTURE?.option_definitions?.[optionId];
									const checked =
										selectedInfra.reference_mode.includes(optionId);

									return (
										<label
											key={optionId}
											className={`checkbox ${checked ? "is-link" : "is-light"}`}
										>
											<input
												type="checkbox"
												className="mr-2"
												checked={checked}
												onChange={() =>
													onToggleInfraOption("reference_mode", optionId)
												}
											/>
											{option?.label ?? optionId}
										</label>
									);
								},
							)}
						</div>
					</div>
				</section>
			)}

			{canShowAspects && (
				<section className="section pt-0">
					<div className="has-text-centered mb-5">
						<h2 className="title is-5 mb-2">WHAT DO YOU WANT TO EVALUATE?</h2>
						<p className="subtitle is-6">
							Aspects are sociotechnical interpretations of real-world needs
						</p>
					</div>

					{hasAspectData ? (
						<div className="columns is-multiline is-centered">
							{aspectCards.map((aspect) => {
								const isSelected = selectedAspects.includes(aspect.id);

								return (
									<div
										key={aspect.id}
										className="column is-6"
									>
										<div className="card">
											<div className="card-content">
												<label className="checkbox is-flex is-align-items-center mb-3">
													<input
														type="checkbox"
														className="mr-3"
														checked={isSelected}
														onChange={() => toggleAspect(aspect.id)}
													/>
													<span className="title is-6 mb-0">
														{aspect.label}
													</span>
												</label>

												<p className="content mb-4">{aspect.definition}</p>

												<div className="buttons are-small">
													<button
														type="button"
														className="button is-small is-light"
														onClick={() => openPopup(aspect.id, "examples")}
													>
														Show Examples
													</button>

													<button
														type="button"
														className="button is-small is-light"
														onClick={() =>
															openPopup(aspect.id, "stakeholder_requirements")
														}
													>
														Show Stakeholder Requirements
													</button>

													<button
														type="button"
														className="button is-small is-light"
														onClick={() => openPopup(aspect.id, "metrics")}
													>
														Show Metrics
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
							<div className="message-body">
								No aspects available for this context yet.
							</div>
						</article>
					)}

					<div className="field is-grouped is-grouped-centered mt-5">
						<p className="control">
							<button
								type="button"
								className="button is-link"
								disabled={!canGenerate}
								onClick={canGenerate ? onGenerate : undefined}
							>
								Generate Evaluation Script
							</button>
						</p>
					</div>
				</section>
			)}

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
