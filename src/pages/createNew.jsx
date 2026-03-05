/** @format */

import { useMemo, useState } from "react";
import {
	TASKS,
	USE_CASES,
	REQUIREMENTS,
	ASPECTS,
	METRICS,
	INFRA_OPTIONS,
	TASK_TO_USECASES,
	REQUIREMENTS_BY_CONTEXT,
	REQUIREMENT_TO_ASPECTS,
	ASPECT_TO_METRICS,
} from "../data/evalConfig";

/**
 * Helpers (pure)
 */
const uniq = (arr) => Array.from(new Set(arr));

const contextKey = (taskId, useCaseId) => `${taskId}__${useCaseId}`;

function getUseCasesForTask(taskId) {
	return TASK_TO_USECASES?.[taskId] ?? [];
}

function getRequirementsForContext(taskId, useCaseId) {
	if (!taskId || !useCaseId) return [];
	const key = contextKey(taskId, useCaseId);
	return REQUIREMENTS_BY_CONTEXT?.[key] ?? [];
}

/**
 * Build "cards" grouped by REQUIREMENT.
 * Each card includes the requirement label + list of aspects, each with metrics.
 */
function buildRequirementCards(selectedRequirementIds) {
	return selectedRequirementIds.map((reqId) => {
		const aspectIds = REQUIREMENT_TO_ASPECTS?.[reqId] ?? [];
		const aspects = aspectIds.map((aspectId) => {
			const metricIds = ASPECT_TO_METRICS?.[aspectId] ?? [];
			return {
				aspectId,
				aspectLabel: ASPECTS?.[aspectId]?.label ?? aspectId,
				metrics: metricIds.map((mId) => ({
					metricId: mId,
					metricLabel: METRICS?.[mId]?.label ?? mId,
				})),
			};
		});

		return {
			requirementId: reqId,
			requirementLabel: REQUIREMENTS?.[reqId]?.label ?? reqId,
			aspects,
		};
	});
}

const CreateNew = () => {
	// Progressive selections
	const [taskId, setTaskId] = useState("");
	const [useCaseId, setUseCaseId] = useState("");
	const [selectedReqIds, setSelectedReqIds] = useState([]);
	const [infraId, setInfraId] = useState("");

	/**
	 * Derived availability flags
	 */
	const taskExists = !!(taskId && TASKS?.[taskId]);
	const availableUseCaseIds = useMemo(
		() => (taskId ? getUseCasesForTask(taskId) : []),
		[taskId],
	);
	const hasUseCases = availableUseCaseIds.length > 0;

	const useCaseExists = !!(useCaseId && USE_CASES?.[useCaseId]);

	const availableRequirementIds = useMemo(
		() =>
			taskId && useCaseId ? getRequirementsForContext(taskId, useCaseId) : [],
		[taskId, useCaseId],
	);
	const hasRequirements = availableRequirementIds.length > 0;

	const cards = useMemo(
		() => buildRequirementCards(selectedReqIds),
		[selectedReqIds],
	);

	const selectedReqAspects = useMemo(() => {
		const allAspectIds = selectedReqIds.flatMap(
			(r) => REQUIREMENT_TO_ASPECTS?.[r] ?? [],
		);
		return uniq(allAspectIds);
	}, [selectedReqIds]);

	const selectedReqMetrics = useMemo(() => {
		const metricIds = selectedReqAspects.flatMap(
			(a) => ASPECT_TO_METRICS?.[a] ?? [],
		);
		return uniq(metricIds);
	}, [selectedReqAspects]);

	const canShowUseCases = !!taskId;
	const canShowRequirements = taskExists && hasUseCases && useCaseId;
	const canShowInfra = canShowRequirements && selectedReqIds.length > 0;
	const canShowAutoMapping = canShowInfra && !!infraId;

	const canGenerate =
		taskExists &&
		useCaseExists &&
		selectedReqIds.length > 0 &&
		!!infraId &&
		// ensure mapping actually produced something
		selectedReqAspects.length > 0 &&
		selectedReqMetrics.length > 0;

	/**
	 * Events (reset downstream choices when upstream changes)
	 */
	const onSelectTask = (newTaskId) => {
		setTaskId(newTaskId);
		// reset downstream
		setUseCaseId("");
		setSelectedReqIds([]);
		setInfraId("");
	};

	const onSelectUseCase = (newUseCaseId) => {
		setUseCaseId(newUseCaseId);
		// reset downstream
		setSelectedReqIds([]);
		setInfraId("");
	};

	const toggleRequirement = (reqId) => {
		setSelectedReqIds((prev) => {
			if (prev.includes(reqId)) return prev.filter((x) => x !== reqId);
			return [...prev, reqId];
		});
		// infra + mapping depends on reqs
		setInfraId("");
	};

	const onSelectInfra = (newInfraId) => setInfraId(newInfraId);

	const noDataForTask =
		taskId &&
		// user selected something we don't have data for
		(!taskExists || !hasUseCases);

	const onGenerate = () => {
		// Placeholder: you’ll plug in your “generate evaluation script” action here.
		// For now, just show a quick summary.
		// eslint-disable-next-line no-alert
		alert(
			[
				`Task: ${TASKS?.[taskId]?.label ?? taskId}`,
				`Use case: ${USE_CASES?.[useCaseId]?.label ?? useCaseId}`,
				`Requirements: ${selectedReqIds
					.map((r) => REQUIREMENTS?.[r]?.label ?? r)
					.join(", ")}`,
				`Infrastructure: ${INFRA_OPTIONS?.[infraId]?.label ?? infraId}`,
				`Aspects: ${selectedReqAspects
					.map((a) => ASPECTS?.[a]?.label ?? a)
					.join(", ")}`,
				`Metrics: ${selectedReqMetrics
					.map((m) => METRICS?.[m]?.label ?? m)
					.join(", ")}`,
			].join("\n"),
		);
	};

	return (
		<div className="container is-max-desktop">
			<section className="section pb-2">
				<h1 className="title is-4">AdSolve – Evaluation Script Builder</h1>
				<p className="subtitle is-6">
					Build an evaluation configuration bottom-up: task → use case →
					requirements → constraints → metrics.
				</p>
			</section>

			{/* TASK */}
			<section className="section pt-0">
				<h2 className="title is-6 mb-2">TASK</h2>
				<div className="buttons">
					{/* Render a few common tasks (even if not available) */}
					{[
						{ id: "conversational_ai", label: "Conversational AI" },
						{ id: "summarisation", label: "Summarisation" },
						{ id: "generation", label: "Generation" },
						{ id: "agentic_ai", label: "Agentic AI" },
					].map((t) => (
						<button
							key={t.id}
							type="button"
							className={`button ${taskId === t.id ? "is-link" : "is-light"}`}
							onClick={() => onSelectTask(t.id)}
						>
							{t.label}
						</button>
					))}
				</div>

				{noDataForTask && (
					<article className="message is-warning mt-3">
						<div className="message-body">
							<strong>No data available for this TASK yet.</strong>
							<br />
							Pick <em>Summarisation</em> to try the currently implemented
							journey.
						</div>
					</article>
				)}
			</section>

			{/* USE CASE (only after TASK selection) */}
			{canShowUseCases && taskExists && hasUseCases && (
				<section className="section pt-0">
					<h2 className="title is-6 mb-2">USE CASE</h2>
					<p className="content is-small mb-2">
						What do you want to {TASKS[taskId].label.toLowerCase()}?
					</p>

					<div className="buttons">
						{availableUseCaseIds.map((ucId) => (
							<button
								key={ucId}
								type="button"
								className={`button ${useCaseId === ucId ? "is-link" : "is-light"}`}
								onClick={() => onSelectUseCase(ucId)}
							>
								{USE_CASES?.[ucId]?.label ?? ucId}
							</button>
						))}
					</div>

					{!useCaseId && <p className="help">Select a use case to continue.</p>}
				</section>
			)}

			{/* REQUIREMENTS (only after USE CASE selection) */}
			{canShowRequirements && (
				<section className="section pt-0">
					<h2 className="title is-6 mb-2">REQUIREMENTS FOR EVALUATION</h2>
					<p className="content is-small mb-3">
						What qualities should the summary satisfy?
					</p>

					{hasRequirements ? (
						<div className="content">
							{availableRequirementIds.map((reqId) => {
								const label = REQUIREMENTS?.[reqId]?.label ?? reqId;
								const checked = selectedReqIds.includes(reqId);
								return (
									<label
										key={reqId}
										className="checkbox is-block mb-2"
									>
										<input
											type="checkbox"
											className="mr-2"
											checked={checked}
											onChange={() => toggleRequirement(reqId)}
										/>
										{label}
									</label>
								);
							})}
						</div>
					) : (
						<article className="message is-warning">
							<div className="message-body">
								No requirements configured for this context yet.
							</div>
						</article>
					)}

					{selectedReqIds.length === 0 && (
						<p className="help mt-2">
							Select at least one requirement to continue.
						</p>
					)}
				</section>
			)}

			{/* INFRA (only after requirements chosen) */}
			{canShowInfra && (
				<section className="section pt-0">
					<h2 className="title is-6 mb-2">INFRASTRUCTURE CONSTRAINTS</h2>
					<p className="content is-small mb-2">Compute environment</p>

					<div className="buttons">
						{Object.values(INFRA_OPTIONS).map((opt) => (
							<button
								key={opt.id}
								type="button"
								className={`button ${infraId === opt.id ? "is-link" : "is-light"}`}
								onClick={() => onSelectInfra(opt.id)}
							>
								{opt.label}
							</button>
						))}
					</div>

					{!infraId && (
						<p className="help">
							Select an infrastructure option to see metrics.
						</p>
					)}
				</section>
			)}

			{/* AUTO-GENERATED MAPPING (cards) */}
			{canShowAutoMapping && (
				<section className="section pt-0">
					<h2 className="title is-6 mb-2">
						ASSOCIATED ASPECTS AND METRICS (auto-generated)
					</h2>
					<p className="content is-small mb-4">
						Based on your selections we recommend the following aspects →
						evaluation metrics.
					</p>

					<div className="columns is-multiline">
						{cards.map((card) => (
							<div
								key={card.requirementId}
								className="column is-12"
							>
								<div className="card">
									<header className="card-header">
										<p className="card-header-title">{card.requirementLabel}</p>
									</header>

									<div className="card-content">
										{card.aspects.length === 0 ? (
											<p className="content is-small">
												No aspects/metrics mapped for this requirement yet.
											</p>
										) : (
											card.aspects.map((a) => (
												<div
													key={a.aspectId}
													className="mb-4"
												>
													<p className="mb-1">
														<strong>Aspect:</strong> {a.aspectLabel}
													</p>
													<p className="mb-1">
														<strong>Metrics:</strong>{" "}
														{a.metrics.length > 0
															? a.metrics.map((m) => m.metricLabel).join(", ")
															: "None configured"}
													</p>
												</div>
											))
										)}
									</div>
								</div>
							</div>
						))}
					</div>

					<div className="field is-grouped is-grouped-right mt-4">
						<p className="control">
							<button
								type="button"
								className={`button is-link ${canGenerate ? "" : "is-static"}`}
								onClick={canGenerate ? onGenerate : undefined}
								disabled={!canGenerate}
								title={
									!canGenerate ? "Complete selections to generate." : "Generate"
								}
							>
								Generate Evaluation Script
							</button>
						</p>
					</div>
				</section>
			)}
		</div>
	);
};

export default CreateNew;
