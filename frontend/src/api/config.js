/** @format */

import { get } from "./client";

export const getUseCases = () => get("/api/use-cases");

export const getPaths = (useCaseId) =>
	get(useCaseId ? `/api/paths?use_case_id=${useCaseId}` : "/api/paths");

export const getPath = (pathId) => get(`/api/paths/${pathId}`);

export const getInfrastructure = () => get("/api/infrastructure");
