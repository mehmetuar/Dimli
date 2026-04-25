import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import PendingPage from './pages/PendingPage';
import ApprovedPage from './pages/ApprovedPage';
import RejectedPage from './pages/RejectedPage';
import SuspendedPage from './pages/SuspendedPage';
import AdminApplicationDetail from './pages/AdminApplicationDetail';
import Layout from './components/Layout';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const token = localStorage.getItem('admin_token');
    if (!token) return <Navigate to="/login" replace />;
    return <>{children}</>;
};

const WithLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ProtectedRoute>
        <Layout>{children}</Layout>
    </ProtectedRoute>
);

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/dashboard" element={<WithLayout><Dashboard /></WithLayout>} />
            <Route path="/pending" element={<WithLayout><PendingPage /></WithLayout>} />
            <Route path="/approved" element={<WithLayout><ApprovedPage /></WithLayout>} />
            <Route path="/rejected" element={<WithLayout><RejectedPage /></WithLayout>} />
            <Route path="/suspended" element={<WithLayout><SuspendedPage /></WithLayout>} />
            <Route path="/applications/:id" element={<WithLayout><AdminApplicationDetail /></WithLayout>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}
