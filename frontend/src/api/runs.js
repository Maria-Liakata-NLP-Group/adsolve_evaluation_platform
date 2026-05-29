/** @format */

import { get } from './client';

export const getRuns = (useCaseId) => {
  const qs = useCaseId != null ? `?use_case_id=${useCaseId}` : '';
  return get(`/api/runs${qs}`);
};

export const getRunsByPath = (pathId) => get(`/api/runs?path_id=${pathId}`);

export const getRunByPath = (pathId) => get(`/api/runs/by-path/${pathId}`);

export const getDashboard = (runId, { datasetId, modelId } = {}) => {
  const params = new URLSearchParams();
  if (datasetId != null) params.set('dataset_id', datasetId);
  if (modelId != null) params.set('model_id', modelId);
  const qs = params.toString();
  return get(`/api/runs/${runId}/dashboard${qs ? `?${qs}` : ''}`);
};

export const getDocuments = (runId, datasetId) => {
  const qs = datasetId != null ? `?dataset_id=${datasetId}` : '';
  return get(`/api/runs/${runId}/documents${qs}`);
};

export const getDocument = (runId, docId) =>
  get(`/api/runs/${runId}/documents/${docId}`);
