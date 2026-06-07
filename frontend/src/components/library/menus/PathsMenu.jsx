/** @format */

import { useEffect, useState } from "react";

// Group flat paths array into { useCaseId: { label, tasks: { taskId: { label, sources: [] } } } }
const buildTree = (paths) =>
	paths.reduce((tree, p) => {
		if (!tree[p.use_case_id]) {
			tree[p.use_case_id] = { label: p.use_case_label, tasks: {} };
		}
		const uc = tree[p.use_case_id];
		if (!uc.tasks[p.task_id]) {
			uc.tasks[p.task_id] = { label: p.task_label, sources: [] };
		}
		uc.tasks[p.task_id].sources.push({
			pathId: p.id,
			id: p.data_source_id,
			label: p.data_source_label,
		});
		return tree;
	}, {});

const rowStyle = (depth, isSelected) => ({
	display: "flex",
	alignItems: "center",
	gap: "0.4rem",
	width: "100%",
	textAlign: "left",
	padding: "0.4rem 0.5rem",
	paddingLeft: `${0.5 + depth * 0.9}rem`,
	border: "none",
	borderRadius: "5px",
	background: isSelected ? "var(--bulma-link-light)" : "transparent",
	color: isSelected ? "var(--bulma-link)" : "inherit",
	fontWeight: isSelected ? 600 : 400,
	fontSize: "0.85rem",
	cursor: "pointer",
});

const Chevron = ({ open }) => (
	<span
		className="is-flex-shrink-0"
		style={{
			display: "inline-block",
			fontSize: "0.65rem",
			transform: open ? "rotate(90deg)" : "none",
			transition: "transform 0.15s",
			color: "var(--bulma-grey)",
		}}
	>
		▶
	</span>
);

const PathsMenu = ({ paths, selectedId, onSelectPath }) => {
	const [expandedUseCases, setExpandedUseCases] = useState(new Set());
	const [expandedTasks, setExpandedTasks] = useState(new Set());

	// When a path is selected (including on direct URL load), expand its ancestors
	useEffect(() => {
		if (!selectedId || !paths.length) return;
		const match = paths.find((p) => p.id === selectedId);
		if (!match) return;
		setExpandedUseCases((prev) => {
			if (prev.has(match.use_case_id)) return prev;
			return new Set([...prev, match.use_case_id]);
		});
		setExpandedTasks((prev) => {
			if (prev.has(match.task_id)) return prev;
			return new Set([...prev, match.task_id]);
		});
	}, [selectedId, paths]);

	const toggleUseCase = (id) =>
		setExpandedUseCases((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	const toggleTask = (id) =>
		setExpandedTasks((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	const tree = buildTree(paths);

	return (
		<div>
			{Object.entries(tree).map(([useCaseId, useCase]) => {
				const ucOpen = expandedUseCases.has(useCaseId);
				return (
					<div key={useCaseId}>
						<button
							type="button"
							style={rowStyle(0, false)}
							onClick={() => toggleUseCase(useCaseId)}
						>
							<Chevron open={ucOpen} />
							<span>{useCase.label}</span>
						</button>

						{ucOpen && Object.entries(useCase.tasks).map(([taskId, task]) => {
							const taskOpen = expandedTasks.has(taskId);
							return (
								<div key={taskId}>
									<button
										type="button"
										style={rowStyle(1, false)}
										onClick={() => toggleTask(taskId)}
									>
										<Chevron open={taskOpen} />
										<span style={{ color: "var(--bulma-grey-dark)" }}>{task.label}</span>
									</button>

									{taskOpen && task.sources.map((source) => (
										<button
											key={source.pathId}
											type="button"
											style={rowStyle(2, selectedId === source.pathId)}
											onClick={() => onSelectPath(source.pathId)}
										>
											<span>{source.label}</span>
										</button>
									))}
								</div>
							);
						})}
					</div>
				);
			})}
		</div>
	);
};

export default PathsMenu;
