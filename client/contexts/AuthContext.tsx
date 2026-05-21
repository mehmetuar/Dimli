import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    initAuth,
    clearAuthSession,
    saveCustomerSession,
    saveBusinessSession,
    getRole,
} from '../services/authStorage';

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
            setToken(null);
            setOwnerId(null);
            setRole(null);
            window.dispatchEvent(new CustomEvent('auth:tokenChanged'));
        };
        window.addEventListener('auth:sessionExpired', onExpired);
        return () => window.removeEventListener('auth:sessionExpired', onExpired);
    }, []);

    const loginAsCustomer = async (newToken: string) => {
        await saveCustomerSession(newToken);
        setToken(newToken);
        setOwnerId(null);
        setRole('user');
        window.dispatchEvent(new CustomEvent('auth:tokenChanged'));
    };

    const loginAsBusiness = async (newToken: string, newOwnerId: string) => {
        await saveBusinessSession(newToken, newOwnerId);
        setToken(newToken);
        setOwnerId(newOwnerId);
        setRole('business_owner');
        window.dispatchEvent(new CustomEvent('auth:tokenChanged'));
    };

    const logout = async () => {
        await clearAuthSession();
        setToken(null);
        setOwnerId(null);
        setRole(null);
        window.dispatchEvent(new CustomEvent('auth:tokenChanged'));
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
