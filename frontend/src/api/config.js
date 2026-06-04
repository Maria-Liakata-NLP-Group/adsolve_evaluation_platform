/** @format */

import { get, post, put, del } from "./client";

// --- read functions ---
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

// --- admin write functions ---

const adminHeaders = (token) => ({ "X-Admin-Token": token });

// Throws ApiError(401) if token is wrong, ApiError(422) if no token sent
export const verifyAdminToken = (token) =>
  get("/api/admin/verify", adminHeaders(token));

export const createMetric = (data, token) =>
  post("/api/metrics", data, adminHeaders(token));

export const updateMetric = (id, data, token) =>
  put(`/api/metrics/${id}`, data, adminHeaders(token));

// Resolves to null on 204 success; throws ApiError(409) if metric is in use
export const deleteMetric = (id, token) =>
  del(`/api/metrics/${id}`, adminHeaders(token));

export const createAspect = (data, token) =>
  post("/api/aspects", data, adminHeaders(token));

export const updateAspect = (id, data, token) =>
  put(`/api/aspects/${id}`, data, adminHeaders(token));

// Resolves to null on 204 success; throws ApiError(409) if aspect is in use
export const deleteAspect = (id, token) =>
  del(`/api/aspects/${id}`, adminHeaders(token));
