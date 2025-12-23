import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Orders API
export const ordersApi = {
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  delete: (id) => api.delete(`/orders/${id}`),
  exportPdf: (id) => `${API}/orders/${id}/export/pdf`,
  exportPpt: (id) => `${API}/orders/${id}/export/ppt`,
  previewHtml: (id) => api.get(`/orders/${id}/preview-html`),
};

// Leather Library API
export const leatherApi = {
  getAll: () => api.get('/leather-library'),
  create: (data) => api.post('/leather-library', data),
  update: (id, data) => api.put(`/leather-library/${id}`, data),
  delete: (id) => api.delete(`/leather-library/${id}`),
  uploadExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/leather-library/upload-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Finish Library API
export const finishApi = {
  getAll: () => api.get('/finish-library'),
  create: (data) => api.post('/finish-library', data),
  update: (id, data) => api.put(`/finish-library/${id}`, data),
  delete: (id) => api.delete(`/finish-library/${id}`),
  uploadExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/finish-library/upload-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Template Settings API
export const templateApi = {
  get: () => api.get('/template-settings'),
  update: (data) => api.put('/template-settings', data),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

// Factories API
export const factoriesApi = {
  getAll: () => api.get('/factories'),
  create: (data) => api.post('/factories', data),
  delete: (id) => api.delete(`/factories/${id}`),
  uploadExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/factories/upload-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Products API
export const productsApi = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  bulkCreate: (products) => api.post('/products/bulk', products),
  uploadExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/products/upload-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Categories API
export const categoriesApi = {
  getAll: () => api.get('/categories'),
};

// Exports API
export const exportsApi = {
  getAll: () => api.get('/exports'),
  getByOrderId: (orderId) => api.get(`/exports/${orderId}`),
};

export default api;
