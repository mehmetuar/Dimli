import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const ProtectedRoute: React.FC = () => {
    const [hasValidToken] = useState(() => !!localStorage.getItem('token'));

    if (!hasValidToken) {
        return <Navigate to="/register" replace />;
    }

    return <Outlet />;
};
