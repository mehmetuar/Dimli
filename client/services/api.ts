import axios from 'axios';

const api = axios.create({
    baseURL: 'http://10.5.50.4:3000', // Updated for iOS Simulator access
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
        // If we get 401 or 403, token is invalid/expired
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Clear invalid token
            localStorage.removeItem('token');
            // Redirect to login only if not already there
            if (window.location.hash !== '#/login' && window.location.hash !== '#/register') {
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

export default api;
