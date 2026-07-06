import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    initAuth,
    clearAuthSession,
    saveCustomerSession,
    saveBusinessSession,
    getRole,
} from '../services/authStorage';
import { unregisterPushOnLogout } from '../services/pushNotificationService';
import { clearCurrentUserCache } from '../services/currentUserStore';
import {
    JOKERS_CACHE_KEY,
    MATCHES_CACHE_KEY,
    NOTIFICATIONS_CACHE_KEY,
    CHANNELS_CACHE_KEY,
    TEAM_CACHE_KEY,
    BIZ_DASHBOARD_CACHE_KEY,
    BUSINESSES_CACHE_KEY,
} from '../utils/listCache';

// Çıkış/oturum düşmesinde kullanıcıya-özel önbellekleri temizle. (userId zarfı
// zaten yanlış hesaba sızmayı engeller; bu temizlik hijyen.) Sondaki literal'ler,
// artık kullanılmayan eski anahtarların (v1 şeması + çıplak cached_businesses —
// v2 ile kullanıcı-kapsamlı zarfa taşındı) storage kalıntısını süpürür.
function clearCustomerCaches(): void {
    clearCurrentUserCache();
    [
        JOKERS_CACHE_KEY,
        MATCHES_CACHE_KEY,
        NOTIFICATIONS_CACHE_KEY,
        CHANNELS_CACHE_KEY,
        TEAM_CACHE_KEY,
        BIZ_DASHBOARD_CACHE_KEY,
        BUSINESSES_CACHE_KEY,
        'cached_matches_v1',
        'cached_mkt_businesses_v1',
        'cached_businesses',
        'cache_cleared_v3',
    ].forEach((k) => {
        try { localStorage.removeItem(k); } catch { /* ignore */ }
    });
}

interface AuthContextValue {
    isReady: boolean;
    token: string | null;
    ownerId: string | null;
    role: 'user' | 'business_owner' | null;
    isCustomer: boolean;
    isBusiness: boolean;
    loginAsCustomer(token: string): Promise<void>;
    loginAsBusiness(token: string, ownerId: string): Promise<void>;
    logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isReady, setIsReady] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [ownerId, setOwnerId] = useState<string | null>(null);
    const [role, setRole] = useState<'user' | 'business_owner' | null>(null);

    useEffect(() => {
        initAuth().then((session) => {
            setToken(session.token);
            setOwnerId(session.ownerId);
            setRole(session.role);
            setIsReady(true);
        });
    }, []);

    useEffect(() => {
        const onExpired = async () => {
            await clearAuthSession();
            clearCustomerCaches();
            setToken(null);
            setOwnerId(null);
            setRole(null);
        };
        window.addEventListener('auth:sessionExpired', onExpired);
        return () => window.removeEventListener('auth:sessionExpired', onExpired);
    }, []);

    const loginAsCustomer = async (newToken: string) => {
        await saveCustomerSession(newToken);
        setToken(newToken);
        setOwnerId(null);
        setRole('user');
    };

    const loginAsBusiness = async (newToken: string, newOwnerId: string) => {
        await saveBusinessSession(newToken, newOwnerId);
        setToken(newToken);
        setOwnerId(newOwnerId);
        setRole('business_owner');
    };

    const logout = async () => {
        // clearAuthSession'dan ÖNCE: bu hesabın push token'ını sunucudan sil + cihaz
        // FCM token'ını geçersizle + listener'ları sıfırla. Aksi halde çıkış sonrası
        // bu hesabın bildirimleri cihaza düşmeye devam eder ve sonraki hesap için
        // token yeniden kaydolmaz.
        await unregisterPushOnLogout();
        await clearAuthSession();
        clearCustomerCaches();
        setToken(null);
        setOwnerId(null);
        setRole(null);
    };

    return (
        <AuthContext.Provider value={{
            isReady,
            token,
            ownerId,
            role,
            isCustomer: role === 'user',
            isBusiness: role === 'business_owner',
            loginAsCustomer,
            loginAsBusiness,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
