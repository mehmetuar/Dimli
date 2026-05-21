import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const PageLoader = () => (
    <div className="flex items-center justify-center h-full w-full bg-slate-900" />
);

export const ProtectedRoute: React.FC = () => {
    const { isReady, token, isBusiness } = useAuth();

    if (!isReady) return <PageLoader />;
    if (!token) return <Navigate to="/login" replace />;
    // İşletme JWT'si müşteri sayfalarına giremez
    if (isBusiness) return <Navigate to="/business/dashboard" replace />;

    return <Outlet />;
};
