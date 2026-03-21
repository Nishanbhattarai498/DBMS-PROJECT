import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('token');

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const loginAdmin = (username, password) =>
  api.post('/auth/login', { username, password });

// Book APIs
export const getBooks = (page = 1, limit = 10, search = '', faculty = '') =>
  api.get('/books', { params: { page, limit, search, faculty } });

export const getBookById = (id) => api.get(`/books/${id}`);

export const addBook = (bookData) => api.post('/books', bookData);

export const updateBook = (id, bookData) => api.put(`/books/${id}`, bookData);

export const deleteBook = (id) => api.delete(`/books/${id}`);

// User APIs
export const getUsers = (page = 1, limit = 10, search = '', department = '', batch_year = '') =>
  api.get('/users', { params: { page, limit, search, department, batch_year } });

export const getUserById = (id) => api.get(`/users/${id}`);

export const addUser = (userData) => api.post('/users', userData);

export const updateUser = (id, userData) => api.put(`/users/${id}`, userData);

export const deleteUser = (id) => api.delete(`/users/${id}`);

// Issue APIs
export const getIssuedBooks = (page = 1, limit = 10, status = 'all') =>
  api.get('/issues', { params: { page, limit, status } });

export const issueBook = (issueData) => api.post('/issues/issue', issueData);

export const returnBook = (issueData) => api.post('/issues/return', issueData);

export const getUserIssuedBooks = (userId) =>
  api.get(`/issues/user/${userId}`);

export const getDashboardStats = (timeRange = 'Monthly', activityRange = 'Last 7 Days') => 
  api.get('/issues/stats/dashboard', { params: { timeRange, activityRange } });

export default api;
