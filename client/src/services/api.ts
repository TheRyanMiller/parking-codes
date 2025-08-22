import axios from 'axios';
import { ParkingCode, Resident, Admin, AuditLog, DashboardStats, AccessSummary } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Token attached to request:', token.substring(0, 20) + '...');
  } else {
    console.log('No token found in localStorage');
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  residentLogin: (email: string, unit: string) =>
    api.post('/auth/resident/login', { email, unit }),
  
  adminLogin: (email: string, password: string) =>
    api.post('/auth/admin/login', { email, password }),
  
  logout: () => api.post('/auth/logout'),
};

export const residentAPI = {
  getMe: () => api.get<Resident>('/resident/me'),
  
  getCodes: (month?: string) => {
    const params = month ? { month } : {};
    return api.get<ParkingCode[]>('/resident/codes', { params });
  },
  
  requestCodes: () => api.post('/resident/request-codes'),
  
  useCode: (id: number) => api.post(`/resident/codes/${id}/use`),
};

export const adminAPI = {
  getResidents: (params: { search?: string; page?: number; limit?: number } = {}) =>
    api.get<{ residents: Resident[]; total: number; page: number; limit: number }>('/admin/residents', { params }),
  
  createResident: (data: Omit<Resident, 'id' | 'created_at' | 'updated_at'>) =>
    api.post<Resident>('/admin/residents', data),
  
  updateResident: (id: number, data: Partial<Omit<Resident, 'id' | 'created_at' | 'updated_at'>>) =>
    api.patch(`/admin/residents/${id}`, data),
  
  deleteResident: (id: number) => api.delete(`/admin/residents/${id}`),
  
  getAdmins: () => api.get<Admin[]>('/admin/admins'),
  
  createAdmin: (email: string, password: string) =>
    api.post('/admin/admins', { email, password }),
  
  deleteAdmin: (id: number) => api.delete(`/admin/admins/${id}`),
  
  uploadCodes: (file: File, monthKey: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('month_key', monthKey);
    return api.post('/admin/codes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  assignCodes: (monthKey: string, residentId: number, count: number) =>
    api.post('/admin/codes/assign', { month_key: monthKey, resident_id: residentId, count }),

  assignCode: (codeId: number, assignTo: string) =>
    api.post(`/admin/codes/${codeId}/assign`, { assign_to: assignTo }),
  
  updateCodeStatus: (id: number, status: string, reason: string) =>
    api.patch(`/admin/codes/${id}/status`, { status, reason }),
  
  getDashboard: (month?: string) => {
    const params = month ? { month } : {};
    return api.get<{ month: string; stats: DashboardStats }>('/admin/dashboard', { params });
  },

  getCodesByStatus: (status: string, month?: string, limit?: number) => {
    const params: any = { limit: limit || 50 };
    if (month) params.month = month;
    return api.get<{ 
      status: string; 
      month: string; 
      codes: Array<{
        id: number;
        code: string;
        status: string;
        assigned_at?: string;
        used_at?: string;
        resident_name?: string;
        resident_email?: string;
        resident_unit?: string;
      }>; 
      count: number 
    }>(`/admin/codes/by-status/${status}`, { params });
  },
  
  getAuditLogs: (params: {
    actor?: string;
    action?: string;
    entity_type?: string;
    entity_id?: number;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  } = {}) =>
    api.get<{ logs: AuditLog[]; page: number; limit: number }>('/admin/audit', { params }),
  
  getAccessSummary: (params: {
    month?: string;
    search?: string;
    access_state?: string;
    page?: number;
    limit?: number;
  } = {}) =>
    api.get<{
      residents: AccessSummary[];
      month: string;
      page: number;
      limit: number;
    }>('/admin/access/summary', { params }),
  
};

export default api;