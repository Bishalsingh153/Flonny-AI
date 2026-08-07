// In production, backend serves this frontend from the same origin.
// In local dev, Vite proxies /api → localhost:5000 (see vite.config.js).
export const API_BASE = import.meta.env.DEV
  ? 'http://localhost:5000/api'
  : '/api';


