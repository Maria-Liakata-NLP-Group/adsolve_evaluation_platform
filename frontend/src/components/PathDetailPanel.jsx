/** @format */

import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	getPath,
	getAspects,
	updatePath,
	deletePath,
	addAspectToPath,
	removeAspectFromPath,
} from "../api/config";
import { getRunsByPath } from "../api/runs";
import { useAdmin } from "../hooks/useAdmin";
import AdminItemActions from "./AdminItemActions";
import ConfirmModal from "./ConfirmModal";
import DescriptionSection from "./DescriptionSection";
import PathAspectCard from "./PathAspectCard";
import PathAspectEditForm from "./PathAspectEditForm";
import RunCard from "./RunCard";

const PathDetailPanel = ({
	pathId,
	onCreateRun,
	onNavigateToAspect,
	onDeleted,
	onUpdated,
}) => {
	const navigate = useNavigate();
	const { isAdmin, token } = useAdmin();
	const [detail, setDetail] = useState(null);
	const [runs, setRuns] = useState([]);
	const [loading, setLoading] = useState(false);

	// Path-level edit state
	const [editingPath, setEditingPath] = useState(false);
	const [pathForm, setPathForm] = useState(null);
	const [savingPath, setSavingPath] = useState(false);
	const [pathSaveError, setPathSaveError] = useState(null);
	const [deleteError, setDeleteError] = useState(null);

	// Aspect management state
	const [editingAspectId, setEditingAspectId] = useState(null);
	const [addingAspect, setAddingAspect] = useState(false);
	const [availableAspects, setAvailableAspects] = useState([]);
	const [selectedAspectToAdd, setSelectedAspectToAdd] = useState("");
	const [addAspectLoading, setAddAspectLoading] = useState(false);
	const [removeAspectError, setRemoveAspectError] = useState(null);
	const [confirm, setConfirm] = useState(null); // { title, message, confirmLabel, onConfirm }

	useEffect(() => {
		if (!pathId) return;
		setEditingPath(false);
		setPathForm(null);
		setEditingAspectId(null);
		setAddingAspect(false);
		setDeleteError(null);
		setRemoveAspectError(null);
		const fetchAll = async () => {
			setLoading(true);
			try {
				const [pathData, runData] = await Promise.all([
					getPath(pathId),
					getRunsByPath(pathId),
				]);
				setDetail(pathData);
				setRuns(runData);
			} catch {
				setDetail(null);
				setRuns([]);
			} finally {
				setLoading(false);
			}
		};
		fetchAll();
	}, [pathId]);

	const canDelete = runs.length === 0;
	const blockingMessage = canDelete
		? null
		: `This task has ${runs.length} run(s) — delete runs first.`;

	const canRemoveAspect = (aspect) =>
		!aspect.metrics.some((m) => (detail?.run_metric_ids ?? []).includes(m.id));

	// Path field edit handlers
	const startEditPath = () => {
		setSavingPath(false);
		setPathSaveError(null);
		setPathForm({
			data_source_label: detail.data_source_label,
			data_source_description: detail.data_source_description ?? "",
			task_description: detail.task_description ?? "",
		});
		setEditingPath(true);
	};

	const cancelEditPath = () => {
		setEditingPath(false);
		setPathForm(null);
		setPathSaveError(null);
	};

	const handleSavePath = async () => {
		setSavingPath(true);
		setPathSaveError(null);
		try {
			const payload = {
				data_source_label: pathForm.data_source_label.trim(),
				data_source_description:
					pathForm.data_source_description.trim() || null,
				task_description: pathForm.task_description.trim() || null,
			};
			const updated = await updatePath(pathId, payload, token);
			setDetail(updated);
			setEditingPath(false);
			onUpdated?.({ id: pathId, data_source_label: updated.data_source_label });
		} catch (err) {
			setPathSaveError(err.message ?? "Save failed. Please try again.");
		} finally {
			setSavingPath(false);
		}
	};

	const handleDeletePath = async () => {
		setDeleteError(null);
		try {
			await deletePath(pathId, token);
			onDeleted?.();
		} catch (err) {
			setDeleteError(err.message ?? "Delete failed.");
		}
	};

	// Aspect management handlers
	const handleRemoveAspect = async (aspectId) => {
		setRemoveAspectError(null);
		try {
			await removeAspectFromPath(pathId, aspectId, token);
			setDetail((prev) => ({
				...prev,
				aspects: prev.aspects.filter((a) => a.id !== aspectId),
			}));
		} catch (err) {
			setRemoveAspectError(err.message ?? "Remove failed.");
		}
	};

	const startAddingAspect = async () => {
		setAddAspectLoading(true);
		try {
			const allAspects = await getAspects();
			const linkedIds = new Set((detail?.aspects ?? []).map((a) => a.id));
			setAvailableAspects(allAspects.filter((a) => !linkedIds.has(a.id)));
			setSelectedAspectToAdd("");
			setAddingAspect(true);
		} catch {
			setAvailableAspects([]);
		} finally {
			setAddAspectLoading(false);
		}
	};

	const handleAddAspect = async () => {
		if (!selectedAspectToAdd) return;
		setAddAspectLoading(true);
		try {
			const updated = await addAspectToPath(
				pathId,
				{ aspect_id: selectedAspectToAdd },
				token,
			);
			setDetail(updated);
			setAddingAspect(false);
			setEditingAspectId(selectedAspectToAdd);
			setSelectedAspectToAdd("");
		} catch (err) {
			setRemoveAspectError(err.message ?? "Add failed.");
		} finally {
			setAddAspectLoading(false);
		}
	};

	if (loading) return <p className="has-text-grey">Loading…</p>;
	if (!detail) return null;

	return (
		<>
			{/* Path heading */}
			<div style={{ marginBottom: "1.5rem" }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "flex-start",
					}}
				>
					<div>
						<p
							className="is-size-7 has-text-grey"
							style={{ marginBottom: "0.2rem" }}
						>
							<span
								className="is-uppercase"
								style={{ letterSpacing: "0.08em" }}
							>
								Use Case
							</span>
							{" · "}
							{detail.use_case_label}
						</p>
						<p
							className="is-size-7 has-text-grey"
							style={{ marginBottom: "0.2rem" }}
						>
							<span
								className="is-uppercase"
								style={{ letterSpacing: "0.08em" }}
							>
								Task
							</span>
							{" · "}
							{detail.task_label}
						</p>
					</div>
					{isAdmin && !editingPath && (
						<AdminItemActions
							canDelete={canDelete}
							blockingMessage={blockingMessage}
							onEdit={startEditPath}
							onDelete={() => setConfirm({
								title: "Delete Task",
								message: `Are you sure you want to delete "${detail.data_source_label}"? This cannot be undone.`,
								confirmLabel: "Yes, delete task",
								onConfirm: handleDeletePath,
							})}
						/>
					)}
				</div>

				{editingPath ? (
					<>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								margin: "0.75rem 0 0.5rem",
							}}
						>
							<span
								style={{
									fontSize: "0.72rem",
									color: "#ffc451",
									fontWeight: 600,
									textTransform: "uppercase",
									letterSpacing: "0.06em",
								}}
							>
								Editing task
							</span>
							<div style={{ display: "flex", gap: "0.4rem" }}>
								<button
									type="button"
									onClick={cancelEditPath}
									className="admin-btn-secondary"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleSavePath}
									disabled={savingPath || !pathForm.data_source_label.trim()}
									className="admin-btn-primary"
									style={{
										opacity:
											savingPath || !pathForm.data_source_label.trim()
												? 0.5
												: 1,
									}}
								>
									{savingPath ? "Saving…" : "Save"}
								</button>
							</div>
						</div>
						<label className="admin-label">Data source label *</label>
						<input
							value={pathForm.data_source_label}
							onChange={(e) =>
								setPathForm((p) => ({
									...p,
									data_source_label: e.target.value,
								}))
							}
							className="admin-input"
							style={{ marginBottom: "0.75rem" }}
							autoFocus
						/>
						<label className="admin-label">Task description</label>
						<textarea
							value={pathForm.task_description}
							onChange={(e) =>
								setPathForm((p) => ({ ...p, task_description: e.target.value }))
							}
							rows={3}
							className="admin-input"
							style={{ resize: "vertical", marginBottom: "0.75rem" }}
						/>
						<label className="admin-label">Data source description</label>
						<textarea
							value={pathForm.data_source_description}
							onChange={(e) =>
								setPathForm((p) => ({
									...p,
									data_source_description: e.target.value,
								}))
							}
							rows={3}
							className="admin-input"
							style={{ resize: "vertical", marginBottom: "0.75rem" }}
						/>
						{pathSaveError && (
							<p style={{ color: "#e07070", fontSize: "0.8rem" }}>
								{pathSaveError}
							</p>
						)}
					</>
				) : (
					<h2
						className="title is-4"
						style={{ marginTop: "0.5rem", marginBottom: 0 }}
					>
						{detail.data_source_label}
					</h2>
				)}
			</div>

			{deleteError && (
				<p
					style={{ color: "#e07070", fontSize: "0.8rem", marginBottom: "1rem" }}
				>
					{deleteError}
				</p>
			)}

			{!editingPath && (
				<>
					<DescriptionSection
						label="Task Description"
						description={detail.task_description}
					/>
					<DescriptionSection
						label="Data Source Description"
						description={detail.data_source_description}
					/>
				</>
			)}

			{/* Recommended aspects */}
			<p
				className="is-size-7 is-uppercase has-text-grey"
				style={{ letterSpacing: "0.1em", marginBottom: "0.75rem" }}
			>
				Recommended Aspects
			</p>

			{removeAspectError && (
				<p
					style={{
						color: "#e07070",
						fontSize: "0.8rem",
						marginBottom: "0.75rem",
					}}
				>
					{removeAspectError}
				</p>
			)}

			{detail.aspects.length === 0 ? (
				<p
					className="has-text-grey is-italic"
					style={{ marginBottom: "2rem" }}
				>
					No aspects defined for this path yet.
				</p>
			) : (
				<div
					className="columns is-multiline"
					style={{ marginBottom: "1rem" }}
				>
					{detail.aspects.map((aspect) => (
						<div
							key={aspect.id}
							className="column is-6"
						>
							{editingAspectId === aspect.id ? (
								<PathAspectEditForm
									key={aspect.id}
									aspect={aspect}
									pathId={pathId}
									runMetricIds={detail.run_metric_ids ?? []}
									onSave={(updatedDetail) => {
										setDetail(updatedDetail);
										setEditingAspectId(null);
									}}
									onCancel={() => setEditingAspectId(null)}
								/>
							) : (
								<>
									<PathAspectCard
										label={aspect.label}
										examples={aspect.examples}
										stakeholderRequirements={aspect.stakeholder_requirements}
										metrics={aspect.metrics}
										onClick={
											onNavigateToAspect
												? () => onNavigateToAspect({ id: aspect.id })
												: undefined
										}
									>
										<div className="is-flex is-justify-content-space-between is-align-items-flex-end mb-2">
											<p className="has-text-weight-semibold">{aspect.label}</p>
											{isAdmin && (
												<div
													style={{
														display: "flex",
														gap: "0.4rem",
														alignSelf: "flex-start",
													}}
												>
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															setEditingAspectId(aspect.id);
														}}
														className="admin-btn-secondary"
													>
														Edit
													</button>
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															setConfirm({
																title: "Remove Aspect",
																message: `Are you sure you want to remove "${aspect.label}" from this task?`,
																confirmLabel: "Yes, remove aspect",
																onConfirm: () => handleRemoveAspect(aspect.id),
															});
														}}
														disabled={!canRemoveAspect(aspect)}
														title={
															!canRemoveAspect(aspect)
																? "Metrics used in a run — cannot remove"
																: "Remove aspect"
														}
														className="admin-btn-secondary"
														style={{
															opacity: !canRemoveAspect(aspect) ? 0.4 : 1,
															cursor: !canRemoveAspect(aspect)
																? "not-allowed"
																: "pointer",
														}}
													>
														Remove
													</button>
												</div>
											)}
										</div>

										{aspect.definition && (
											<p className="is-size-7">{aspect.definition}</p>
										)}
									</PathAspectCard>
								</>
							)}
						</div>
					))}
				</div>
			)}

			{/* Add Aspect — admin only */}
			{isAdmin && (
				<div style={{ marginBottom: "2rem" }}>
					{addingAspect ? (
						<div
							style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
						>
							<select
								value={selectedAspectToAdd}
								onChange={(e) => setSelectedAspectToAdd(e.target.value)}
								className="admin-input"
								style={{ flex: 1 }}
							>
								<option
									value=""
									disabled
								>
									Select an aspect to add…
								</option>
								{availableAspects.map((a) => (
									<option
										key={a.id}
										value={a.id}
									>
										{a.label}
									</option>
								))}
							</select>
							<button
								type="button"
								onClick={handleAddAspect}
								disabled={!selectedAspectToAdd || addAspectLoading}
								className="admin-btn-primary"
								style={{ opacity: !selectedAspectToAdd || addAspectLoading ? 0.5 : 1 }}
							>
								{addAspectLoading ? "Adding…" : "Add"}
							</button>
							<button
								type="button"
								onClick={() => setAddingAspect(false)}
								className="admin-btn-secondary"
							>
								Cancel
							</button>
						</div>
					) : (
						<button
							type="button"
							onClick={startAddingAspect}
							disabled={addAspectLoading}
							className="admin-btn-add"
						>
							{addAspectLoading ? "Loading…" : "+ Add Aspect"}
						</button>
					)}
				</div>
			)}

			{/* Completed evaluation runs */}
			<p
				className="is-size-7 is-uppercase has-text-grey"
				style={{ letterSpacing: "0.1em", marginBottom: "0.75rem" }}
			>
				Completed Evaluation Runs
			</p>
			<p
				className="is-size-7 has-text-grey"
				style={{ marginBottom: "1rem" }}
			>
				Click one of the evaluation run cards to add a dataset or model to an
				existing run, or{" "}
				<button
					type="button"
					className="button is-ghost is-small"
					style={{
						padding: 0,
						height: "auto",
						verticalAlign: "baseline",
						color: "var(--bulma-link)",
					}}
					onClick={() => onCreateRun?.(pathId)}
				>
					create a new run
				</button>{" "}
				for this evaluation path.
			</p>
			{runs.length === 0 ? (
				<p className="has-text-grey is-italic">
					No completed runs for this path yet.
				</p>
			) : (
				<div className="columns is-multiline">
					{runs.map((run) => (
						<div
							key={run.id}
							className="column is-6"
						>
							<RunCard
								run={{
									...run,
									task_description: null,
									data_source_description: null,
								}}
								onNavigate={() =>
									navigate(
										`/use-cases/${detail.use_case_id}/${run.path_id}/${run.id}`,
									)
								}
							/>
						</div>
					))}
				</div>
			)}

			<ConfirmModal
				isOpen={!!confirm}
				title={confirm?.title}
				message={confirm?.message}
				confirmLabel={confirm?.confirmLabel}
				onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
				onCancel={() => setConfirm(null)}
			/>
		</>
	);
};

PathDetailPanel.propTypes = {
	pathId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	onCreateRun: PropTypes.func,
	onNavigateToAspect: PropTypes.func,
	onDeleted: PropTypes.func,
	onUpdated: PropTypes.func,
};

export default PathDetailPanel;
