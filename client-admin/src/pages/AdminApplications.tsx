import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../services/adminApi';

type Status = 'pending' | 'active' | 'rejected' | 'suspended';

const STATUS_LABELS: Record<Status, string> = {
    pending: 'Bekliyor',
    active: 'Onaylandı',
    rejected: 'Reddedildi',
    suspended: 'Askıya Alındı',
};

const STATUS_COLORS: Record<Status, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    suspended: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export default function AdminApplications() {
    const navigate = useNavigate();
    const [applications, setApplications] = useState<any[]>([]);
    const [filter, setFilter] = useState<Status | 'all'>('pending');
    const [loading, setLoading] = useState(true);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const status = filter === 'all' ? undefined : filter;
            const res = await adminApi.get('/admin/applications', { params: { status } });
            setApplications(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchApplications(); }, [filter]);

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        navigate('/login');
    };

    return (
        <div className="min-h-screen p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-white italic">DİMLİ Admin</h1>
                    <p className="text-slate-400 text-sm">İşletme Başvuruları</p>
                </div>
                <button onClick={handleLogout}
                    className="text-slate-400 hover:text-white text-sm font-bold transition-colors">
                    Çıkış
                </button>
            </div>

            {/* Filtreler */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {(['pending', 'active', 'rejected', 'all'] as const).map(s => (
                    <button key={s}
                        onClick={() => setFilter(s)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border ${filter === s
                            ? 'bg-orange-600 border-orange-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                    >
                        {s === 'all' ? 'Tümü' : STATUS_LABELS[s]}
                    </button>
                ))}
            </div>

            {/* Liste */}
            {loading ? (
                <div className="text-center text-slate-400 py-16">Yükleniyor...</div>
            ) : applications.length === 0 ? (
                <div className="text-center text-slate-500 py-16">Başvuru bulunamadı.</div>
            ) : (
                <div className="space-y-3">
                    {applications.map(app => (
                        <div key={app.id}
                            onClick={() => navigate(`/applications/${app.id}`)}
                            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 cursor-pointer hover:border-slate-600 transition-all flex items-center justify-between gap-4"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="font-black text-white truncate">{app.name}</h3>
                                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[app.status as Status]}`}>
                                        {STATUS_LABELS[app.status as Status]}
                                    </span>
                                </div>
                                <p className="text-slate-400 text-sm">
                                    {app.city} / {app.district} — {app.pitches?.length || 0} saha
                                </p>
                                {app.owner && (
                                    <p className="text-slate-500 text-xs mt-0.5">
                                        {app.owner.fullName} · {app.owner.email}
                                    </p>
                                )}
                            </div>
                            <div className="text-slate-500 text-xs shrink-0 text-right">
                                {new Date(app.createdAt).toLocaleDateString('tr-TR')}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
