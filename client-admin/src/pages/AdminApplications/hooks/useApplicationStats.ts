import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../../services/adminApi';

type Status = 'pending' | 'active' | 'rejected' | 'suspended';

export const useApplicationStats = () => {
    const navigate = useNavigate();
    const [applications, setApplications] = useState<any[]>([]);
    const [filter, setFilter] = useState<Status | 'all'>('pending');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Record<Status, number>>({ pending: 0, active: 0, rejected: 0, suspended: 0 });

    const fetchApplications = async (currentFilter: Status | 'all') => {
        setLoading(true);
        try {
            const status = currentFilter === 'all' ? undefined : currentFilter;
            const res = await adminApi.get('/admin/applications', { params: { status } });
            setApplications(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [p, a, r, s] = await Promise.all([
                    adminApi.get('/admin/applications', { params: { status: 'pending' } }),
                    adminApi.get('/admin/applications', { params: { status: 'active' } }),
                    adminApi.get('/admin/applications', { params: { status: 'rejected' } }),
                    adminApi.get('/admin/applications', { params: { status: 'suspended' } }),
                ]);
                setStats({ pending: p.data.length, active: a.data.length, rejected: r.data.length, suspended: s.data.length });
            } catch (err) { console.error(err); }
        };
        fetchStats();
    }, []);

    useEffect(() => { fetchApplications(filter); }, [filter]);

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        navigate('/login');
    };

    return { applications, filter, setFilter, loading, stats, handleLogout };
};
