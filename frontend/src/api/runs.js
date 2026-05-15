/** @format */

import { get } from './client';

export const getRuns = () => get('/api/runs');

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
