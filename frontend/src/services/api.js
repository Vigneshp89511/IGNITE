import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const signup = data => API.post('/auth/signup', data);
export const login = data => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');

// Users
export const getUsers = () => API.get('/users');
export const createUser = data => API.post('/users', data);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const deleteUser = id => API.delete(`/users/${id}`);

// Expenses
export const getExpenses = () => API.get('/expenses');
export const getExpense = id => API.get(`/expenses/${id}`);
export const createExpense = data => API.post('/expenses', data);
export const getPendingApprovals = () => API.get('/expenses/pending-approval');
export const approveExpense = (id, data) => API.post(`/expenses/${id}/approve`, data);
export const rejectExpense = (id, data) => API.post(`/expenses/${id}/reject`, data);
export const ocrExtract = formData => API.post('/expenses/ocr/extract', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// Approval Rules
export const getApprovalRules = () => API.get('/approval-rules');
export const createApprovalRule = data => API.post('/approval-rules', data);
export const updateApprovalRule = (id, data) => API.put(`/approval-rules/${id}`, data);
export const deleteApprovalRule = id => API.delete(`/approval-rules/${id}`);

export default API;
