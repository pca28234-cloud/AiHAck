import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ──────── FARMERS ────────
export const getFarmers = () => api.get('/farmers');
export const createFarmer = (data) => api.post('/farmers', data);

// ──────── HARVESTS ────────
export const getHarvests = () => api.get('/harvests');
export const createHarvest = (data) => api.post('/harvests', data);
export const updateHarvest = (id, data) => api.put(`/harvests/${id}`, data);

// ──────── BUYERS ────────
export const getBuyers = () => api.get('/buyers');
export const createBuyer = (data) => api.post('/buyers', data);

// ──────── ORDERS ────────
export const getOrders = () => api.get('/orders');
export const createOrder = (data) => api.post('/orders', data);

// ──────── VEHICLES ────────
export const getVehicles = () => api.get('/vehicles');
export const createVehicle = (data) => api.post('/vehicles', data);

// ──────── AI ────────
export const parseHarvest = (data) => api.post('/ai/parse-harvest', data);
export const runAIMatch = () => api.post('/ai/match');
export const askWhatIf = (data) => api.post('/ai/what-if', data);

// ──────── DASHBOARD ────────
export const getDashboard = () => api.get('/dashboard');

export default api;
