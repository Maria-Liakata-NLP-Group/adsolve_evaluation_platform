/** @format */

import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	getPath,
	getAspects,
	deletePath,
	addAspectToPath,
	removeAspectFromPath,
} from "../../../api/config";
import { getRunsByPath } from "../../../api/runs";
import { useAdmin } from "../../../hooks/useAdmin";
import AdminItemActions from "../../navigation_and_controls/AdminItemActions";
import ConfirmModal from "../../modals_and_cards/ConfirmModal";
import DescriptionSection from "./DescriptionSection";
import PathAspectCard from "../../modals_and_cards/PathAspectCard";
import PathAspectEditForm from "../edits_and_create/PathAspectEditForm";
import RunCard from "../../modals_and_cards/RunCard";
import PathDetailEdit from "../edits_and_create/PathDetailEdit";

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
							onEdit={() => setEditingPath(true)}
							onDelete={() =>
								setConfirm({
									title: "Delete Task",
									message: `Are you sure you want to delete "${detail.data_source_label}"? This cannot be undone.`,
									confirmLabel: "Yes, delete task",
									onConfirm: handleDeletePath,
								})
							}
						/>
					)}
				</div>

				{editingPath ? (
					<PathDetailEdit
						path={detail}
						onSaved={(updated) => {
							setDetail(updated);
							setEditingPath(false);
							onUpdated?.({
								id: pathId,
								data_source_label: updated.data_source_label,
							});
						}}
						onCancel={() => setEditingPath(false)}
					/>
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
					className="text-error"
					style={{ marginBottom: "1rem" }}
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
				className="is-size-7 is-uppercase has-text-grey is-flex is-align-items-center is-gap-1"
				style={{ letterSpacing: "0.1em", marginBottom: "0.75rem" }}
			>
				<span>Recommended Aspects </span>
				{isAdmin && (
					<button
						type="button"
						onClick={startAddingAspect}
						disabled={addAspectLoading}
						className="admin-btn-add"
					/>
				)}
			</p>

			{/* Add Aspect — admin only */}

			{addingAspect && (
				<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
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
						style={{
							opacity: !selectedAspectToAdd || addAspectLoading ? 0.5 : 1,
						}}
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
			)}

			{removeAspectError && (
				<p
					className="text-error"
					style={{ marginBottom: "0.75rem" }}
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
											<AdminItemActions
												canDelete={canRemoveAspect(aspect)}
												blockingMessage="Metrics used in a run — cannot remove"
												deleteLabel="Remove"
												onEdit={(e) => {
													e.stopPropagation();
													setEditingAspectId(aspect.id);
												}}
												onDelete={(e) => {
													e.stopPropagation();
													setConfirm({
														title: "Remove Aspect",
														message: `Are you sure you want to remove "${aspect.label}" from this task?`,
														confirmLabel: "Yes, remove aspect",
														onConfirm: () => handleRemoveAspect(aspect.id),
													});
												}}
											/>
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
										`/runs/${detail.use_case_id}/${run.path_id}/${run.id}`,
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
				onConfirm={() => {
					confirm?.onConfirm();
					setConfirm(null);
				}}
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
