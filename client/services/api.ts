import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000',
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

export default api;
