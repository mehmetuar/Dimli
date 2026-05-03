import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const BusinessProtectedRoute: React.FC = () => {
    const [isValidating, setIsValidating] = useState(true);
    const [hasValidSession, setHasValidSession] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const ownerId = localStorage.getItem('ownerId');
        setHasValidSession(!!token && !!ownerId);
        setIsValidating(false);
    }, []);

    if (isValidating) return null;
    if (!hasValidSession) return <Navigate to="/business/login" replace />;
    return <Outlet />;
};
