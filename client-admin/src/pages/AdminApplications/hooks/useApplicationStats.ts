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
            const res = await adminApi.get('/admin/applications', { params: { status, page: 1, limit: 20 } });
            setApplications(res.data.items ?? []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Sayım için tüm listeyi çekmek yerine limit=1 ile sadece `total` okunur.
                const [p, a, r, s] = await Promise.all([
                    adminApi.get('/admin/applications', { params: { status: 'pending', limit: 1 } }),
                    adminApi.get('/admin/applications', { params: { status: 'active', limit: 1 } }),
                    adminApi.get('/admin/applications', { params: { status: 'rejected', limit: 1 } }),
                    adminApi.get('/admin/applications', { params: { status: 'suspended', limit: 1 } }),
                ]);
                setStats({
                    pending: p.data.total ?? 0,
                    active: a.data.total ?? 0,
                    rejected: r.data.total ?? 0,
                    suspended: s.data.total ?? 0,
                });
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
