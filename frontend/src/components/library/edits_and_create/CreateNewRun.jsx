/** @format */

import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import PathAspectCard from "../../modals_and_cards/PathAspectCard";
import RunSubmission from "./RunSubmission";
import { getPath } from "../../../api/config";
import { usePathConfig } from "../../../hooks/usePathConfig";

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
			selectedCompute.some((c) =>
				metric.supported_compute_environments.includes(c),
			);
		const refOk =
			metric.supported_reference_modes.length === 0 ||
			selectedReference.some((r) =>
				metric.supported_reference_modes.includes(r),
			);
		return computeOk && refOk;
	});

const CreateNewRun = ({ pathId, onCancel }) => {
	const {
		paths,
		infrastructure,
		loading,
		error: configError,
	} = usePathConfig();

	const [selectedUseCaseId, setSelectedUseCaseId] = useState("");
	const [selectedDataSourceId, setSelectedDataSourceId] = useState("");
	const [selectedAspects, setSelectedAspects] = useState([]);
	const [selectedInfra, setSelectedInfra] = useState({
		compute_environment: [],
		reference_mode: [],
	});

	const [runTitle, setRunTitle] = useState("");
	const [runDescription, setRunDescription] = useState("");

	const [pathConfig, setPathConfig] = useState(null);
	const [pathConfigLoading, setPathConfigLoading] = useState(false);

	// Initialise infra selection once infrastructure config is loaded
	useEffect(() => {
		if (infrastructure) {
			setSelectedInfra(getDefaultInfraSelection(infrastructure));
		}
	}, [infrastructure]);

	// Auto-select use case, task, and data source when a pathId is provided
	useEffect(() => {
		if (!pathId || loading || !paths.length || !infrastructure) return;
		const path = paths.find((p) => p.id === pathId);
		if (!path) return;
		setSelectedUseCaseId(path.use_case_id);
		setSelectedDataSourceId(path.data_source_id);
		setSelectedAspects([]);
		setSelectedInfra(getDefaultInfraSelection(infrastructure));
		setPathConfigLoading(true);
		getPath(path.id)
			.then(setPathConfig)
			.catch(() => setPathConfig(null))
			.finally(() => setPathConfigLoading(false));
		// Run once after config loads; pathId is fixed for the lifetime of this panel view
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loading]);

	const aspectCards = useMemo(() => getAspectCards(pathConfig), [pathConfig]);

	const selectedPath = useMemo(
		() => (pathId ? paths.find((p) => p.id === pathId) : null),
		[pathId, paths],
	);

	const canShowInfrastructure = !!selectedDataSourceId && !loading;
	const canShowAspects = canShowInfrastructure && !!pathConfig && !pathConfigLoading;
	const hasAspectData = aspectCards.length > 0;

	// Only the run title reaches the ingest request; aspect and infrastructure
	// selections are retained for the future "calculate" mode, not this one.
	const canGenerate = !!runTitle.trim();

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

	if (configError) return <div>Error loading config: {configError}</div>;
	if (loading) return <div>Loading…</div>;

	return (
		<div>
			<h1 className="title is-4 mb-1">
				Create Evaluation Run
			</h1>
			<p className="subtitle is-6 mb-6">
				Create new configuration for{" "}
				{selectedPath
					? `${selectedPath.use_case_label} → ${selectedPath.task_label} → ${selectedPath.data_source_label}`
					: "…"}
			</p>

			<section className="block">
				<div className="field">
					<label className="label is-small">Add run title</label>
					<div className="control">
						<input
							className="input"
							type="text"
							value={runTitle}
							onChange={(e) => setRunTitle(e.target.value)}
						/>
					</div>
				</div>
				<div className="field">
					<label className="label is-small">Add run description (optional)</label>
					<div className="control">
						<textarea
							className="textarea"
							rows={5}
							value={runDescription}
							onChange={(e) => setRunDescription(e.target.value)}
						/>
					</div>
				</div>
			</section>

			{canShowInfrastructure && (
				<section className="block">
					<h2 className="title is-6 mb-3">INFRASTRUCTURE CONSTRAINTS</h2>
					<p className="content mb-2">
						Filter metrics based on your infrastructure requirements.
					</p>

					<div className="mb-5">
						<p className="content is-small mb-2">
							{infrastructure?.compute_environment?.label ??
								"Compute environment"}
						</p>
						<div className="buttons">
							{(infrastructure?.compute_environment?.options ?? []).map(
								(option) => {
									const checked = selectedInfra.compute_environment.includes(
										option.id,
									);
									return (
										<label
											key={option.id}
											className={`checkbox ${checked ? "is-link" : "is-light"}`}
										>
											<input
												type="checkbox"
												className="mr-2"
												checked={checked}
												onChange={() =>
													onToggleInfraOption("compute_environment", option.id)
												}
											/>
											{option.label}
										</label>
									);
								},
							)}
						</div>
					</div>

					<div>
						<p className="content is-small mb-2">
							{infrastructure?.reference_mode?.label ?? "References"}
						</p>
						<div className="buttons">
							{(infrastructure?.reference_mode?.options ?? []).map((option) => {
								const checked = selectedInfra.reference_mode.includes(
									option.id,
								);
								return (
									<label
										key={option.id}
										className={`checkbox ${checked ? "is-link" : "is-light"}`}
									>
										<input
											type="checkbox"
											className="mr-2"
											checked={checked}
											onChange={() =>
												onToggleInfraOption("reference_mode", option.id)
											}
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
				<section className="block">
					<p>Loading aspects…</p>
				</section>
			)}

			{canShowAspects && (
				<section className="block">
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
								const filteredMetrics = getFilteredMetrics(
									aspect,
									selectedInfra.compute_environment,
									selectedInfra.reference_mode,
								);
								return (
									<div
										key={aspect.id}
										className="column is-6"
									>
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
							<div className="message-body">
								No aspects available for this data source yet.
							</div>
						</article>
					)}
				</section>
			)}

			<RunSubmission
				pathId={pathId}
				useCaseId={selectedUseCaseId}
				title={runTitle}
				notes={runDescription}
				disabled={!canGenerate}
				onCancel={onCancel}
			/>
		</div>
	);
};

CreateNewRun.propTypes = {
	pathId: PropTypes.string.isRequired,
	onCancel: PropTypes.func.isRequired,
};

export default CreateNewRun;
