import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const ProtectedRoute: React.FC = () => {
    const [hasToken, setHasToken] = useState(() => !!localStorage.getItem('token'));

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
