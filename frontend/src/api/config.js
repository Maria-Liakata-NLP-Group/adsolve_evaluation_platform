/** @format */

import { get } from "./client";

export const getUseCases = () => get("/api/use-cases");

export const getPaths = (useCaseId) =>
	get(useCaseId ? `/api/paths?use_case_id=${useCaseId}` : "/api/paths");

export const getPath = (pathId) => get(`/api/paths/${pathId}`);

export const getInfrastructure = () => get("/api/infrastructure");

export const getAspects = () => get("/api/aspects");

export const getAspect = (aspectId) => get(`/api/aspects/${aspectId}`);

export const getMetrics = () => get("/api/metrics");

export const getMetric = (metricId) => get(`/api/metrics/${metricId}`);

export const getAspectPaths = (aspectId) => get(`/api/aspects/${aspectId}/paths`);
