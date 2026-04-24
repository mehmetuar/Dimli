import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminApplications from './pages/AdminApplications';
import AdminApplicationDetail from './pages/AdminApplicationDetail';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const token = localStorage.getItem('admin_token');
    if (!token) return <Navigate to="/login" replace />;
    return <>{children}</>;
};

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/applications" element={<ProtectedRoute><AdminApplications /></ProtectedRoute>} />
            <Route path="/applications/:id" element={<ProtectedRoute><AdminApplicationDetail /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/applications" replace />} />
        </Routes>
    );
}
