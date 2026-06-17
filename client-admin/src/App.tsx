import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin/AdminLogin';
import Dashboard from './pages/Dashboard/Dashboard';
import PendingPage from './pages/PendingPage/PendingPage';
import ApprovedPage from './pages/ApprovedPage/ApprovedPage';
import RejectedPage from './pages/RejectedPage/RejectedPage';
import SuspendedPage from './pages/SuspendedPage/SuspendedPage';
import AdminApplicationDetail from './pages/AdminApplicationDetail/AdminApplicationDetail';
import ChangeRequestsPage from './pages/ChangeRequestsPage/ChangeRequestsPage';
import PitchApprovalsPage from './pages/PitchApprovalsPage/PitchApprovalsPage';
import ReportsPage from './pages/ReportsPage/ReportsPage';
import BannedUsersPage from './pages/BannedUsersPage/BannedUsersPage';
import DeletedBusinessesPage from './pages/DeletedBusinessesPage/DeletedBusinessesPage';
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
            <Route path="/change-requests" element={<WithLayout><ChangeRequestsPage /></WithLayout>} />
            <Route path="/pitch-approvals" element={<WithLayout><PitchApprovalsPage /></WithLayout>} />
            <Route path="/reports" element={<WithLayout><ReportsPage /></WithLayout>} />
            <Route path="/banned-users" element={<WithLayout><BannedUsersPage /></WithLayout>} />
            <Route path="/deleted" element={<WithLayout><DeletedBusinessesPage /></WithLayout>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}
