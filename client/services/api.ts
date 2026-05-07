import axios from 'axios';

const getBaseURL = (): string => {
  return 'https://dimli-server.onrender.com';
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

let isRedirecting = false;

// Response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error URL:', error.config?.url);
        console.error('API Error Message:', error.message);
        console.error('API Error Response:', error.response);

        // If we get 401 or 403, token is invalid/expired
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            if (!isRedirecting) {
                isRedirecting = true;
                localStorage.removeItem('token');
                const hash = window.location.hash;
                if (hash !== '#/login' && hash !== '#/register' && !hash.startsWith('#/business/login') && !hash.startsWith('#/business/register')) {
                    window.location.hash = '#/login';
                }
                setTimeout(() => { isRedirecting = false; }, 3000);
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

export const getBusinesses = async (coords?: { lat: number; lng: number; radius?: number }) => {
    const params = coords
        ? { lat: coords.lat, lng: coords.lng, radius: coords.radius ?? 20 }
        : undefined;
    const response = await api.get('/businesses', { params });
    return response.data;
};

export default api;
