/** @format */

import yaml from "js-yaml";

/* -------------------------
   GLOBAL YAML FILES
------------------------- */

import useCasesRaw from "./globals/use_cases.yaml?raw";
import tasksRaw from "./globals/tasks.yaml?raw";
import infrastructureRaw from "./globals/infrastructure.yaml?raw";
import aspectsRaw from "./globals/aspects.yaml?raw";
import metricsRaw from "./globals/metrics.yaml?raw";

/* -------------------------
   PATH INDEX
------------------------- */

import pathIndexRaw from "./paths/index.yaml?raw";

/* -------------------------
   PATH FILES
------------------------- */

import mentalHealthSummarisationSocialMediaPostsRaw from "./paths/mental_health/summarisation_social_media_posts.yaml?raw";
import mentalHealthSummarisationDialoguePlusConversationsRaw from "./paths/mental_health/summarisation_dialogue_plus_conversations.yaml?raw";

/* -------------------------
   YAML PARSER
------------------------- */

const parse = (raw) => yaml.load(raw) || {};

/* -------------------------
   GLOBAL DEFINITIONS
------------------------- */

export const USE_CASES = parse(useCasesRaw).use_cases || {};
export const TASKS = parse(tasksRaw).tasks || {};
export const INFRASTRUCTURE = parse(infrastructureRaw).infrastructure || {};
export const ASPECTS = parse(aspectsRaw).aspects || {};
export const METRICS = parse(metricsRaw).metrics || {};

/* -------------------------
   PATH INDEX
------------------------- */

export const PATH_INDEX = parse(pathIndexRaw);

/* -------------------------
   PATH FILE REGISTRY
------------------------- */

const rawPaths = {
	mental_health_summarisation_social_media_posts:
		mentalHealthSummarisationSocialMediaPostsRaw,
	mental_health_summarisation_dialogue_plus_conversations:
		mentalHealthSummarisationDialoguePlusConversationsRaw,
};

export const PATHS_BY_ID = Object.fromEntries(
	Object.entries(rawPaths).map(([id, raw]) => [id, parse(raw)]),
);

/* -------------------------
   DERIVED RELATIONS
------------------------- */

export const TASKS_BY_USE_CASE = (PATH_INDEX.paths || []).reduce((acc, p) => {
	if (!acc[p.use_case]) acc[p.use_case] = [];
	if (!acc[p.use_case].includes(p.task)) {
		acc[p.use_case].push(p.task);
	}
	return acc;
}, {});

/* -------------------------
   HELPERS
------------------------- */

export const buildPathId = (useCaseId, taskId, dataSourceId) =>
	`${useCaseId}_${taskId}_${dataSourceId}`;

export const getPathConfig = (useCaseId, taskId, dataSourceId) => {
	const id = buildPathId(useCaseId, taskId, dataSourceId);
	return PATHS_BY_ID[id] || null;
};

export const getAvailableTasksForUseCase = (useCaseId) =>
	TASKS_BY_USE_CASE[useCaseId] || [];

export const getAvailableDataSources = (useCaseId, taskId) => {
	return (PATH_INDEX.paths || [])
		.filter((p) => p.use_case === useCaseId && p.task === taskId)
		.map((p) => ({
			id: p.data_source,
			label: p.data_source_label || p.data_source,
		}));
};
