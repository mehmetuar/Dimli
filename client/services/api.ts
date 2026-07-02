import axios from 'axios';
import { getToken, clearAuthSession } from './authStorage';

const BASE_URL = 'https://dimli-server.onrender.com';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
});

// Interceptor'suz doğrulama instance'ı — sonsuz döngü riski yok
const verifyAxios = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

api.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

let isVerifyingAuth = false;

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            if (!isVerifyingAuth) {
                isVerifyingAuth = true;
                try {
                    const token = getToken();
                    if (!token) {
                        window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
                        return Promise.reject(error);
                    }
                    // Token gerçekten geçersiz mi doğrula — asıl endpoint geçici hata vermiş olabilir
                    await verifyAxios.get('/users/me', {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    // Başarılı → token geçerli, asıl endpoint geçici hata verdi
                } catch (ve: any) {
                    if (ve.response?.status === 401 || ve.response?.status === 403) {
                        // Token kesinlikle geçersiz
                        await clearAuthSession();
                        window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
                    } else if (!ve.response) {
                        // Server tamamen erişilemez — kullanıcıyı login ekranına yönlendir
                        window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
                    }
                } finally {
                    setTimeout(() => { isVerifyingAuth = false; }, 5000);
                }
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

export const getBusinesses = async (
    filter?: { lat: number; lng: number; radius?: number } | { ids: string[] }
) => {
    const params = !filter
        ? undefined
        : 'ids' in filter
            ? { ids: filter.ids.join(',') }
            : { lat: filter.lat, lng: filter.lng, radius: filter.radius ?? 20 };
    const response = await api.get('/businesses', { params });
    return response.data;
};

// Konum-önce + sayfalı (offset) + sunucu-taraflı sıralama — müşteri Sahalar listesi.
// Aynı /businesses endpoint'i; `limit` verilince sunucu { items, total, hasMore } döner.
export type BusinessSort =
    | 'distance'
    | 'price_asc'
    | 'price_desc'
    | 'rating'
    | 'rating_count';

export const getBusinessesPaged = async (params: {
    lat: number;
    lng: number;
    radius?: number;
    limit?: number;
    offset?: number;
    sort?: BusinessSort;
}): Promise<{ items: any[]; total: number; hasMore: boolean }> => {
    const { lat, lng, radius = 20, limit = 20, offset = 0, sort = 'distance' } = params;
    const response = await api.get('/businesses', {
        params: { lat, lng, radius, limit, offset, sort },
    });
    return response.data;
};

export const getFacilities = (): Promise<string[]> =>
    api.get('/facilities').then(r => r.data);

export default api;
