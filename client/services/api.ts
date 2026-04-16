import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const getBaseURL = (): string => {
  if (Capacitor.getPlatform() === 'android') {
    // Android emülatörde 10.0.2.2 → Mac localhost'u işaret eder
    // Gerçek Android cihazda Mac'in LAN IP'sini kullan (ör: 192.168.1.x:3000)
    return 'http://10.0.2.2:3000';
  }
  return 'http://Mehmet-MacBook-Air-2.local:3000';
};

const api = axios.create({
    baseURL: getBaseURL(),
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error URL:', error.config?.url);
        console.error('API Error Message:', error.message);
        console.error('API Error Response:', error.response);

        // If we get 401 or 403, token is invalid/expired
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Clear invalid token
            localStorage.removeItem('token');
            // Redirect to login only if not already there
            const hash = window.location.hash;
            if (hash !== '#/login' && hash !== '#/register' && !hash.startsWith('#/business/login') && !hash.startsWith('#/business/register')) {
                window.location.hash = '#/login';
            }
        }
        return Promise.reject(error);
    }
);


export const getProfile = async () => {
    const response = await api.get('/users/me');
    return response.data;
};

export const updateProfile = async (data: any) => {
    const response = await api.patch('/users/me', data);
    return response.data;
};

export const changePassword = async (data: any) => {
    const response = await api.post('/users/change-password', data);
    return response.data;
};

export const getPitches = async () => {
    const response = await api.get('/pitches');
    return response.data;
};

export const getReservationsByPitch = async (pitchId: string, date: string) => {
    const response = await api.get(`/reservations/pitch/${pitchId}`, {
        params: { date }
    });
    return response.data;
};

export const getBusinesses = async () => {
    const response = await api.get('/businesses');
    return response.data;
};

export default api;
