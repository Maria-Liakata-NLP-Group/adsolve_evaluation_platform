/** @format */

import { get, post } from "./client";

const adminHeaders = (token) => ({ "X-Admin-Token": token });

// Metrics this platform can both calculate and store results for.
export const getCalculableMetrics = (token) =>
  get("/api/evaluations/metrics", adminHeaders(token));

// Dispatches a calculation; resolves to { job_id }
export const submitEvaluation = (payload, token) =>
  post("/api/evaluations", payload, adminHeaders(token));

// Resolves to { job_id, status, title, error, run_id, submitted_at, finished_at }
export const getEvaluationJob = (jobId, token) =>
  get(`/api/evaluations/${jobId}`, adminHeaders(token));
