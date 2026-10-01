import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ──────────── FARMERS ────────────
export const getFarmers = () => api.get('/farmers');
export const createFarmer = (data) => api.post('/farmers', data);

// ──────────── HARVESTS ────────────
export const getHarvests = () => api.get('/harvests');
export const getAvailableHarvests = () => api.get('/harvests/available');
export const createHarvest = (data) => api.post('/harvests', data);
export const updateHarvest = (id, data) => api.put(`/harvests/${id}`, data);

// ──────────── BUYERS ────────────
export const getBuyers = () => api.get('/buyers');
export const createBuyer = (data) => api.post('/buyers', data);

// ──────────── ORDERS ────────────
export const getOrders = () => api.get('/orders');
export const getOrdersExtended = () => api.get('/orders-extended');
export const createOrder = (data) => api.post('/orders', data);
export const getOrderDetail = (id) => api.get(`/orders/${id}/detail`);
export const acceptOrder = (id) => api.post(`/orders/${id}/accept`);
export const rejectOrder = (id) => api.post(`/orders/${id}/reject`);

// ──────────── BUYER REQUESTS ────────────
export const getBuyerRequests = () => api.get('/buyer-requests');
export const createBuyerRequest = (data) => api.post('/buyer-requests', data);

// ──────────── VEHICLES ────────────
export const getVehicles = () => api.get('/vehicles');
export const createVehicle = (data) => api.post('/vehicles', data);
export const updateVehicleStatus = (id, status) => api.put(`/vehicles/${id}/status`, { status });

// ──────────── TRANSPORT AGENT ────────────
export const getTransportRecommendation = (orderId) => api.get(`/transport/recommendations/${orderId}`);
export const recommendTransport = (orderId) => api.post(`/transport/recommend/${orderId}`);
export const getTransportAlternatives = (orderId) => api.post(`/transport/alternatives/${orderId}`);

// ──────────── AI ────────────
export const parseHarvest = (data) => api.post('/ai/parse-harvest', data);
export const runAIMatch = () => api.post('/ai/match');
export const askWhatIf = (data) => api.post('/ai/what-if', data);

// ──────────── NOTIFICATIONS ────────────
export const getNotifications = (role) => api.get(`/notifications?role=${role}`);
export const markNotificationRead = (id) => api.post(`/notifications/${id}/read`);

// ──────────── DASHBOARD ────────────
export const getDashboard = () => api.get('/dashboard');
export const getAdminDashboard = () => api.get('/dashboard/admin');

export default api;
