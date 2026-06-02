import { apiPath } from '../config';

export const buildTvDisplayPath = (branchId, counterId) => `/tv-display/${branchId || 0}/${counterId || '01'}`;

export const buildTvDisplayUrl = (branchId, counterId) => `${window.location.origin}${buildTvDisplayPath(branchId, counterId)}`;

export const fetchTvDisplayData = async (branchId, counterId) => {
  const response = await fetch(apiPath(`/api/tv-display/${branchId}/${counterId}`), {
    cache: 'no-store'
  });
  return response.json();
};

export const createTvPayload = (display = {}) => ({
  currentToken: display.current_token || '--',
  nextToken: display.next_token || '--',
  counter: display.counter || '01',
  serviceProvider: display.service_provider || 'Service Desk',
  status: display.status || 'Waiting',
  message: display.message || 'Please wait for your token number.'
});

export const sendWifiQueuePayload = async (endpoint, payload) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response.ok;
};
