/** @format */

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

// Reads error detail from JSON body when available
const parseError = async (response, path) => {
  const data = await response.json().catch(() => ({}));
  return new ApiError(response.status, data.detail ?? `API error ${response.status}: ${path}`);
};

export const get = async (path, headers = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, { headers });
  if (!response.ok) throw new ApiError(response.status, `API error ${response.status}: ${path}`);
  return response.json();
};

export const post = async (path, body, headers = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await parseError(response, path);
  return response.json();
};

export const put = async (path, body, headers = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await parseError(response, path);
  return response.json();
};

// Named 'del' because 'delete' is a reserved word in JS
export const del = async (path, headers = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) throw await parseError(response, path);
  return response.status === 204 ? null : response.json();
};
