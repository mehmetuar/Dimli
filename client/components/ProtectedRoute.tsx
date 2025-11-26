import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const ProtectedRoute: React.FC = () => {
    const [isValidating, setIsValidating] = useState(true);
    const [hasValidToken, setHasValidToken] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');

        // If no token, immediately fail
        if (!token) {
            setHasValidToken(false);
            setIsValidating(false);
            return;
        }

        // Token exists - let API interceptor handle validation
        // If token is invalid, interceptor will redirect to login
        setHasValidToken(true);
        setIsValidating(false);
    }, []);

    // Show nothing while validating
    if (isValidating) {
        return null;
    }

    // If no valid token, redirect to login
    if (!hasValidToken) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
