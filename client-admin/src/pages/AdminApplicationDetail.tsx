import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminApi from '../services/adminApi';

export default function AdminApplicationDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [app, setApp] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        adminApi.get(`/admin/applications/${id}`)
            .then(r => setApp(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    const approve = async () => {
        setActionLoading(true);
        try {
            await adminApi.post(`/admin/applications/${id}/approve`);
            setMessage('✓ İşletme onaylandı.');
            setApp((prev: any) => ({ ...prev, status: 'active' }));
        } catch (err: any) {
            setMessage('Hata: ' + (err.response?.data?.message || 'Bir şeyler yanlış gitti.'));
        } finally {
            setActionLoading(false);
        }
    };

    const reject = async () => {
        if (!rejectReason.trim()) return;
        setActionLoading(true);
        try {
            await adminApi.post(`/admin/applications/${id}/reject`, { reason: rejectReason });
            setMessage('İşletme reddedildi.');
            setApp((prev: any) => ({ ...prev, status: 'rejected', rejectionReason: rejectReason }));
            setShowRejectForm(false);
        } catch (err: any) {
            setMessage('Hata: ' + (err.response?.data?.message || 'Bir şeyler yanlış gitti.'));
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Yükleniyor...</div>;
    if (!app) return <div className="min-h-screen flex items-center justify-center text-slate-400">Başvuru bulunamadı.</div>;

    const isPending = app.status === 'pending';

    return (
        <div className="min-h-screen p-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate('/applications')}
                    className="text-slate-400 hover:text-white text-sm font-bold transition-colors">
                    ← Geri
                </button>
                <h1 className="text-xl font-black text-white">{app.name}</h1>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${app.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    app.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}>
                    {app.status === 'active' ? 'Onaylandı' : app.status === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                </span>
            </div>

            {message && (
                <div className="bg-slate-800 border border-slate-700 text-slate-200 p-4 rounded-xl mb-6 font-bold">
                    {message}
                </div>
            )}

            <div className="space-y-4">
                {/* Yetkili Bilgileri */}
                {app.owner && (
                    <Section title="Yetkili Bilgileri">
                        <Row label="Ad Soyad" value={app.owner.fullName} />
                        <Row label="E-posta" value={app.owner.email} />
                        <Row label="Telefon" value={app.owner.phone || '-'} />
                    </Section>
                )}

                {/* İşletme Bilgileri */}
                <Section title="İşletme Bilgileri">
                    <Row label="İşletme Adı" value={app.name} />
                    <Row label="Şehir / İlçe" value={`${app.city || '-'} / ${app.district || '-'}`} />
                    <Row label="Adres" value={app.address || '-'} />
                    <Row label="Telefon" value={app.phone || '-'} />
                    <Row label="Çalışma Saatleri" value={`${app.openTime || '-'} - ${app.closeTime || '-'}`} />
                </Section>

                {/* Konum */}
                {app.latitude && app.longitude && (
                    <Section title="Konum">
                        <div className="rounded-xl overflow-hidden border border-slate-700">
                            <iframe
                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${app.longitude - 0.005},${app.latitude - 0.005},${app.longitude + 0.005},${app.latitude + 0.005}&layer=mapnik&marker=${app.latitude},${app.longitude}`}
                                width="100%" height="240" style={{ border: 0 }}
                                title="Konum"
                            />
                        </div>
                        <p className="text-slate-400 text-xs mt-2">
                            {app.latitude.toFixed(6)}, {app.longitude.toFixed(6)}
                        </p>
                    </Section>
                )}

                {/* Sahalar */}
                {app.pitches && app.pitches.length > 0 && (
                    <Section title={`Sahalar (${app.pitches.length})`}>
                        <div className="space-y-3">
                            {app.pitches.map((pitch: any, i: number) => (
                                <div key={pitch.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-black text-orange-400 text-sm">{i + 1}. {pitch.name}</h4>
                                        <span className="text-slate-400 text-xs">{pitch.type}</span>
                                    </div>
                                    <Row label="Saatlik Ücret" value={`${pitch.pricePerHour?.toLocaleString('tr-TR') || '-'} TL`} />
                                    {pitch.imageUrl && (
                                        <img src={pitch.imageUrl} alt={pitch.name}
                                            className="mt-3 w-full h-40 object-cover rounded-lg border border-slate-600" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Red nedeni */}
                {app.rejectionReason && (
                    <Section title="Red Nedeni">
                        <p className="text-red-400 text-sm">{app.rejectionReason}</p>
                    </Section>
                )}

                {/* Aksiyon butonları */}
                {isPending && (
                    <div className="space-y-3 pt-2">
                        {!showRejectForm ? (
                            <div className="flex gap-3">
                                <button
                                    onClick={approve}
                                    disabled={actionLoading}
                                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-3 rounded-xl font-black transition-colors"
                                >
                                    {actionLoading ? 'İşleniyor...' : '✓ Onayla'}
                                </button>
                                <button
                                    onClick={() => setShowRejectForm(true)}
                                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 py-3 rounded-xl font-black transition-colors"
                                >
                                    ✕ Reddet
                                </button>
                            </div>
                        ) : (
                            <div className="bg-slate-900 border border-red-500/30 rounded-xl p-4 space-y-3">
                                <p className="text-red-400 font-bold text-sm">Red Nedeni</p>
                                <textarea
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    placeholder="İşletmenin neden reddedildiğini yazın..."
                                    rows={3}
                                    className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-red-500 resize-none text-sm"
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => setShowRejectForm(false)}
                                        className="flex-1 bg-slate-800 text-slate-400 py-2 rounded-xl font-bold text-sm">
                                        İptal
                                    </button>
                                    <button onClick={reject} disabled={actionLoading || !rejectReason.trim()}
                                        className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2 rounded-xl font-black text-sm transition-colors">
                                        {actionLoading ? 'Gönderiliyor...' : 'Reddet'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="font-black text-white text-sm uppercase mb-4 text-orange-400">{title}</h3>
        <div className="space-y-2">{children}</div>
    </div>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-medium">{value}</span>
    </div>
);
