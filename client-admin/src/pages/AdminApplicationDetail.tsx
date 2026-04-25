import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminApi from '../services/adminApi';
import {
    IconChevronLeft, IconClock, IconCheck, IconX, IconPause, IconPending,
    IconUser, IconBuilding, IconPin, IconPhone, IconPitch, IconIndoor, IconOutdoor,
    getFacilityIcon,
} from '../components/Icons';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseFacilities = (raw: string[] | string | null | undefined): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(f => f && f.trim().length > 0);
    if (typeof raw === 'string' && raw.length > 0) return raw.split(',').map(f => f.trim()).filter(Boolean);
    return [];
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const FacilityChips: React.FC<{ facilities: string[] | string | null | undefined }> = ({ facilities }) => {
    const list = parseFacilities(facilities);
    if (list.length === 0) {
        return <p className="text-slate-500 text-xs italic">İmkan belirtilmemiş</p>;
    }
    return (
        <div className="flex flex-wrap gap-1.5 mt-1">
            {list.map(facility => {
                const FIcon = getFacilityIcon(facility);
                return (
                    <span
                        key={facility}
                        className="inline-flex items-center gap-1.5 bg-[#253352] border border-slate-600/50 text-slate-200 text-xs font-medium px-2.5 py-1 rounded-full"
                    >
                        <FIcon size={12} className="text-orange-400 shrink-0" />
                        {facility}
                    </span>
                );
            })}
        </div>
    );
};

const TimeSlotsGrid: React.FC<{
    timeSlots: { id: string; startTime: string; endTime: string; isActive: boolean }[];
    pitch: any;
    businessOpenTime: string | null;
    businessCloseTime: string | null;
}> = ({ timeSlots, pitch, businessOpenTime, businessCloseTime }) => {
    if (!timeSlots || timeSlots.length === 0) {
        return (
            <p className="text-slate-500 text-xs italic flex items-center gap-1">
                <IconClock size={12} className="text-slate-600" />
                Varsayılan saatler kullanılıyor
            </p>
        );
    }

    const sorted = [...timeSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const hasCustomHours =
        pitch.openTime !== null &&
        pitch.openTime !== undefined &&
        (pitch.openTime !== businessOpenTime || pitch.closeTime !== businessCloseTime);
    const activeCount = sorted.filter(s => s.isActive).length;

    return (
        <div className="mt-1 space-y-2">
            {hasCustomHours && (
                <div className="flex items-center gap-1.5">
                    <IconClock size={12} className="text-amber-400 shrink-0" />
                    <span className="text-amber-400 text-xs font-medium">
                        Saha saatleri: {pitch.openTime} – {pitch.closeTime}
                    </span>
                </div>
            )}
            <div className="flex flex-wrap gap-1.5">
                {sorted.map(slot => (
                    <span
                        key={slot.id}
                        className={`inline-block font-mono text-xs px-2 py-1 rounded-md border ${slot.isActive
                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-500 line-through opacity-50'
                            }`}
                    >
                        {slot.startTime}–{slot.endTime}
                    </span>
                ))}
            </div>
            <p className="text-slate-500 text-xs">
                {activeCount} aktif / {sorted.length} toplam slot
            </p>
        </div>
    );
};

const Section: React.FC<{
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}> = ({ title, icon, children }) => (
    <div className="bg-[#1e2d47] border border-slate-700/50 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-orange-500 rounded-full" />
            {icon && <span className="text-orange-400">{icon}</span>}
            <h3 className="font-black text-white text-xs uppercase tracking-wider">{title}</h3>
        </div>
        <div className="space-y-0">{children}</div>
    </div>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between items-start gap-4 text-sm py-2 border-b border-slate-700/40 last:border-0">
        <span className="text-slate-400 shrink-0">{label}</span>
        <span className="text-slate-100 font-medium text-right break-words max-w-[60%]">{value}</span>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
    label: string;
    classes: string;
    Icon: React.FC<{ size?: number; className?: string }>;
}> = {
    active: { label: 'Onaylandı', classes: 'bg-green-500/15 text-green-300 border-green-500/30', Icon: IconCheck },
    rejected: { label: 'Reddedildi', classes: 'bg-red-500/15 text-red-300 border-red-500/30', Icon: IconX },
    suspended: { label: 'Askıya Alındı', classes: 'bg-slate-500/15 text-slate-300 border-slate-500/30', Icon: IconPause },
    pending: { label: 'Bekliyor', classes: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30', Icon: IconPending },
};

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
            setMessage('İşletme onaylandı.');
            setApp((prev: any) => ({ ...prev, status: 'active', reviewedAt: new Date().toISOString() }));
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
            setApp((prev: any) => ({ ...prev, status: 'rejected', rejectionReason: rejectReason, reviewedAt: new Date().toISOString() }));
            setShowRejectForm(false);
        } catch (err: any) {
            setMessage('Hata: ' + (err.response?.data?.message || 'Bir şeyler yanlış gitti.'));
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
                <IconClock size={16} className="animate-spin" />
                Yükleniyor...
            </div>
        </div>
    );
    if (!app) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-slate-400 text-sm">Başvuru bulunamadı.</div>
        </div>
    );

    const isPending = app.status === 'pending';
    const statusCfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.pending;
    const StatusIcon = statusCfg.Icon;

    return (
        <div className="min-h-screen p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
                <button
                    onClick={() => navigate('/applications')}
                    className="flex items-center gap-1 text-slate-400 hover:text-white text-sm font-bold transition-colors"
                >
                    <IconChevronLeft size={16} />
                    Geri
                </button>
                <h1 className="text-xl font-black text-white">{app.name}</h1>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${statusCfg.classes}`}>
                    <StatusIcon size={11} />
                    {statusCfg.label}
                </span>
                {app.reviewedAt && (
                    <span className="flex items-center gap-1 text-slate-500 text-xs ml-auto">
                        <IconClock size={11} />
                        {app.status === 'active' ? 'Onaylandı' : 'İşlendi'}: {new Date(app.reviewedAt).toLocaleDateString('tr-TR')}
                    </span>
                )}
            </div>

            {message && (
                <div className="bg-[#1e2d47] border border-slate-600/60 text-slate-100 p-4 rounded-xl mb-6 font-bold text-sm flex items-center gap-2">
                    <IconCheck size={16} className="text-green-400 shrink-0" />
                    {message}
                </div>
            )}

            <div className="space-y-4">
                {/* Yetkili + İşletme Bilgileri — 2 kolon */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {app.owner && (
                        <Section title="Yetkili Bilgileri" icon={<IconUser size={13} />}>
                            <Row label="Ad Soyad" value={app.owner.fullName} />
                            <Row label="E-posta" value={app.owner.email} />
                            <Row label="Telefon" value={app.owner.phone || '-'} />
                        </Section>
                    )}
                    <Section title="İşletme Bilgileri" icon={<IconBuilding size={13} />}>
                        <Row label="İşletme Adı" value={app.name} />
                        <Row label="Şehir / İlçe" value={`${app.city || '-'} / ${app.district || '-'}`} />
                        <Row label="Adres" value={app.address || '-'} />
                        <Row label="Telefon" value={app.phone || '-'} />
                        <Row label="Çalışma Saatleri" value={`${app.openTime || '-'} – ${app.closeTime || '-'}`} />
                    </Section>
                </div>

                {/* Konum */}
                {app.latitude && app.longitude && (
                    <Section title="Konum" icon={<IconPin size={13} />}>
                        <div className="rounded-xl overflow-hidden border border-slate-700/60">
                            <iframe
                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${app.longitude - 0.005},${app.latitude - 0.005},${app.longitude + 0.005},${app.latitude + 0.005}&layer=mapnik&marker=${app.latitude},${app.longitude}`}
                                width="100%" height="220" style={{ border: 0 }}
                                title="Konum"
                            />
                        </div>
                        <p className="flex items-center gap-1 text-slate-400 text-xs mt-2">
                            <IconPin size={11} className="text-slate-500" />
                            {app.latitude.toFixed(6)}, {app.longitude.toFixed(6)}
                        </p>
                    </Section>
                )}

                {/* Sahalar */}
                {app.pitches && app.pitches.length > 0 && (
                    <Section title={`Sahalar (${app.pitches.length})`} icon={<IconPitch size={13} />}>
                        <div className="space-y-4">
                            {app.pitches.map((pitch: any, i: number) => (
                                <div key={pitch.id} className="bg-[#253352] rounded-xl p-4 border border-slate-600/40 space-y-3">
                                    {/* Kart başlığı */}
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <IconPitch size={14} className="text-orange-400 shrink-0" />
                                            <h4 className="font-black text-orange-300 text-sm">{i + 1}. {pitch.name}</h4>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {pitch.type && (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-[#1e2d47] text-slate-300 border border-slate-600/50">
                                                    {pitch.type === 'INDOOR'
                                                        ? <><IconIndoor size={11} /> Kapalı</>
                                                        : <><IconOutdoor size={11} /> Açık</>
                                                    }
                                                </span>
                                            )}
                                            <span className="text-orange-300 text-xs font-bold">
                                                {pitch.pricePerHour?.toLocaleString('tr-TR') || '–'} ₺/saat
                                            </span>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-600/30" />

                                    {/* İmkanlar */}
                                    <div>
                                        <p className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wide">İmkanlar</p>
                                        <FacilityChips facilities={pitch.facilities} />
                                    </div>

                                    {/* Saat Slotları */}
                                    <div>
                                        <p className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wide">Saat Slotları</p>
                                        <TimeSlotsGrid
                                            timeSlots={pitch.timeSlots}
                                            pitch={pitch}
                                            businessOpenTime={app.openTime}
                                            businessCloseTime={app.closeTime}
                                        />
                                    </div>

                                    {/* Fotoğraf */}
                                    {pitch.imageUrl && (
                                        <img
                                            src={pitch.imageUrl}
                                            alt={pitch.name}
                                            className="mt-1 w-full h-40 object-cover rounded-lg border border-slate-600/50"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Red nedeni */}
                {app.rejectionReason && (
                    <Section title="Red Nedeni" icon={<IconX size={13} />}>
                        <p className="text-red-300 text-sm">{app.rejectionReason}</p>
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
                                    className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white py-3 rounded-xl font-black transition-colors"
                                >
                                    <IconCheck size={16} />
                                    {actionLoading ? 'İşleniyor...' : 'Onayla'}
                                </button>
                                <button
                                    onClick={() => setShowRejectForm(true)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-red-600/15 hover:bg-red-600/25 border border-red-500/40 text-red-300 py-3 rounded-xl font-black transition-colors"
                                >
                                    <IconX size={16} />
                                    Reddet
                                </button>
                            </div>
                        ) : (
                            <div className="bg-[#1e2d47] border border-red-500/30 rounded-xl p-4 space-y-3">
                                <p className="text-red-300 font-bold text-sm flex items-center gap-1.5">
                                    <IconX size={14} />
                                    Red Nedeni
                                </p>
                                <textarea
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    placeholder="İşletmenin neden reddedildiğini yazın..."
                                    rows={3}
                                    className="w-full bg-[#253352] border border-slate-600/60 text-white p-3 rounded-xl focus:outline-none focus:border-red-500 resize-none text-sm placeholder-slate-500"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowRejectForm(false)}
                                        className="flex-1 bg-white/5 text-slate-300 py-2 rounded-xl font-bold text-sm hover:bg-white/10 transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        onClick={reject}
                                        disabled={actionLoading || !rejectReason.trim()}
                                        className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2 rounded-xl font-black text-sm transition-colors"
                                    >
                                        <IconX size={14} />
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
