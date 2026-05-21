import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const PageLoader = () => (
    <div className="flex items-center justify-center h-full w-full bg-slate-900" />
);

export const BusinessProtectedRoute: React.FC = () => {
    const { isReady, token, isBusiness, isCustomer, ownerId } = useAuth();

    if (!isReady) return <PageLoader />;
    if (!token) return <Navigate to="/business/login" replace />;
    // Müşteri JWT'si işletme sayfalarına giremez
    if (isCustomer) return <Navigate to="/" replace />;
    // İşletme token'ı var ama ownerId kaybolmuşsa yeniden giriş iste
    if (isBusiness && !ownerId) return <Navigate to="/business/login" replace />;

    return <Outlet />;
};
