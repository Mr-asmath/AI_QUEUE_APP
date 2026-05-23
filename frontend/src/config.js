export const API_ORIGIN = (
  process.env.REACT_APP_API_ORIGIN ||
  (process.env.REACT_APP_API_URL || '').replace(/\/api\/?$/, '') ||
  'http://localhost:5000'
).replace(/\/$/, '');

export const API_URL = `${API_ORIGIN}/api`;

export const apiPath = (path) => `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
