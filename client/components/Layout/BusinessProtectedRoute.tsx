import React, { useState } from 'react';
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

export const BusinessProtectedRoute: React.FC = () => {
    const [hasValidSession] = useState(() => {
        const token = localStorage.getItem('token');
        const ownerId = localStorage.getItem('ownerId');
        const valid = isTokenValid(token) && !!ownerId;
        if (!valid && token) localStorage.removeItem('token');
        return valid;
    });

    if (!hasValidSession) return <Navigate to="/business/login" replace />;
    return <Outlet />;
};
