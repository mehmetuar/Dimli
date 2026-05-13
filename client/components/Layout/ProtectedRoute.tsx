import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

function isTokenValid(token: string | null): boolean {
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return Date.now() < payload.exp * 1000;
    } catch {
        return false;
    }
}

export const ProtectedRoute: React.FC = () => {
    const [hasToken, setHasToken] = useState(() => {
        const token = localStorage.getItem('token');
        const valid = isTokenValid(token);
        if (!valid && token) localStorage.removeItem('token');
        return valid;
    });

    useEffect(() => {
        const onExpired = () => setHasToken(false);
        window.addEventListener('auth:sessionExpired', onExpired);
        return () => window.removeEventListener('auth:sessionExpired', onExpired);
    }, []);

    if (!hasToken) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
