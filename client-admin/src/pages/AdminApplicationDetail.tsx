import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminApi from '../services/adminApi';
import {
    IconChevronLeft, IconClock, IconCheck, IconX, IconPause, IconPending,
    IconUser, IconBuilding, IconPin, IconPitch, IconIndoor, IconOutdoor,
    IconEdit, IconSave, IconPlus, IconTrash, IconImage,
    getFacilityIcon, FACILITY_ICON_MAP,
} from '../components/Icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditSlot {
    _key: string;       // UI key (id for existing, temp string for new)
    id?: string;        // undefined = new slot
    startTime: string;
    endTime: string;
    isActive: boolean;
    _delete: boolean;
}

interface EditPitch {
    id: string;
    name: string;
    type: string;
    pricePerHour: string;
    facilities: string[];
    imageUrl: string;
    timeSlots: EditSlot[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseFacilities = (raw: string[] | string | null | undefined): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(f => f && f.trim().length > 0);
    if (typeof raw === 'string' && raw.length > 0) return raw.split(',').map(f => f.trim()).filter(Boolean);
    return [];
};

const ALL_FACILITIES = Object.keys(FACILITY_ICON_MAP);

let tempSlotCounter = 0;
const newKey = () => `new_${++tempSlotCounter}`;

// ─── Sub-components ───────────────────────────────────────────────────────────

const FacilityChips: React.FC<{ facilities: string[] | string | null | undefined }> = ({ facilities }) => {
    const list = parseFacilities(facilities);
    if (list.length === 0) return <p className="text-slate-500 text-xs italic">İmkan belirtilmemiş</p>;
    return (
        <div className="flex flex-wrap gap-1.5 mt-1">
            {list.map(facility => {
                const FIcon = getFacilityIcon(facility);
                return (
                    <span key={facility} className="inline-flex items-center gap-1.5 bg-[#253352] border border-slate-600/50 text-slate-200 text-xs font-medium px-2.5 py-1 rounded-full">
                        <FIcon size={12} className="text-orange-400 shrink-0" />
                        {facility}
                    </span>
                );
            })}
        </div>
    );
};

const Section: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-[#1e2d47] border border-slate-700/50 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-orange-500 rounded-full" />
            {icon && <span className="text-orange-400">{icon}</span>}
            <h3 className="font-black text-[#dde8f5] text-xs uppercase tracking-wider">{title}</h3>
        </div>
        {children}
    </div>
);

interface RowProps {
    label: string;
    value: string;
    editMode?: boolean;
    onChange?: (v: string) => void;
    placeholder?: string;
    type?: string;
}

const Row: React.FC<RowProps> = ({ label, value, editMode, onChange, placeholder, type = 'text' }) => (
    <div className="flex justify-between items-start gap-4 text-sm py-2 border-b border-slate-700/40 last:border-0">
        <span className="text-slate-400 shrink-0 pt-0.5">{label}</span>
        {editMode && onChange ? (
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder ?? label}
                className="text-right bg-[#253352] border border-slate-600/60 text-[#dde8f5] px-2.5 py-1 rounded-lg focus:outline-none focus:border-orange-500 text-sm w-full max-w-[60%] transition-all"
            />
        ) : (
            <span className="text-slate-100 font-medium text-right break-words max-w-[60%]">{value || '–'}</span>
        )}
    </div>
);

// ─── Facilities Edit ──────────────────────────────────────────────────────────

const FacilitiesEdit: React.FC<{
    facilities: string[];
    onChange: (f: string[]) => void;
}> = ({ facilities, onChange }) => {
    const [customInput, setCustomInput] = useState('');
    const [showPreset, setShowPreset] = useState(false);

    const remove = (f: string) => onChange(facilities.filter(x => x !== f));
    const add = (f: string) => {
        if (f.trim() && !facilities.includes(f.trim())) onChange([...facilities, f.trim()]);
    };
    const addCustom = () => {
        add(customInput);
        setCustomInput('');
    };

    return (
        <div className="space-y-3">
            {/* Mevcut imkanlar */}
            <div className="flex flex-wrap gap-1.5">
                {facilities.length === 0 && <p className="text-slate-500 text-xs italic">Henüz imkan yok</p>}
                {facilities.map(f => {
                    const FIcon = getFacilityIcon(f);
                    return (
                        <span key={f} className="inline-flex items-center gap-1.5 bg-[#1e2d47] border border-slate-600/50 text-slate-200 text-xs font-medium px-2.5 py-1 rounded-full group">
                            <FIcon size={11} className="text-orange-400 shrink-0" />
                            {f}
                            <button onClick={() => remove(f)} className="ml-0.5 text-slate-500 hover:text-red-400 transition-colors">
                                <IconX size={10} />
                            </button>
                        </span>
                    );
                })}
            </div>

            {/* Hazır imkan listesi */}
            <div>
                <button
                    onClick={() => setShowPreset(p => !p)}
                    className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-bold transition-colors"
                >
                    <IconPlus size={12} />
                    {showPreset ? 'Listeyi Kapat' : 'Hazır İmkandan Ekle'}
                </button>
                {showPreset && (
                    <div className="mt-2 grid grid-cols-2 gap-1">
                        {ALL_FACILITIES.filter(f => !facilities.includes(f)).map(f => {
                            const FIcon = getFacilityIcon(f);
                            return (
                                <button
                                    key={f}
                                    onClick={() => { add(f); }}
                                    className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-orange-300 hover:bg-white/5 px-2 py-1.5 rounded-lg transition-all text-left"
                                >
                                    <FIcon size={11} className="text-slate-500 shrink-0" />
                                    {f}
                                </button>
                            );
                        })}
                        {ALL_FACILITIES.every(f => facilities.includes(f)) && (
                            <p className="text-slate-500 text-xs italic col-span-2">Tüm hazır imkanlar eklenmiş</p>
                        )}
                    </div>
                )}
            </div>

            {/* Özel imkan */}
            <div className="flex gap-2">
                <input
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustom()}
                    placeholder="Özel imkan ekle..."
                    className="flex-1 bg-[#253352] border border-slate-600/60 text-[#dde8f5] px-3 py-1.5 rounded-lg focus:outline-none focus:border-orange-500 text-xs placeholder-slate-500"
                />
                <button
                    onClick={addCustom}
                    disabled={!customInput.trim()}
                    className="flex items-center gap-1 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                >
                    <IconPlus size={12} /> Ekle
                </button>
            </div>
        </div>
    );
};

// ─── Time Slots Edit ──────────────────────────────────────────────────────────

const TimeSlotsEdit: React.FC<{
    slots: EditSlot[];
    onChange: (slots: EditSlot[]) => void;
}> = ({ slots, onChange }) => {
    const [newStart, setNewStart] = useState('');
    const [newEnd, setNewEnd] = useState('');

    const active = slots.filter(s => !s._delete);

    const toggle = (key: string) =>
        onChange(slots.map(s => s._key === key ? { ...s, isActive: !s.isActive } : s));

    const markDelete = (key: string) =>
        onChange(slots.map(s => s._key === key ? { ...s, _delete: true } : s));

    const addSlot = () => {
        if (!newStart || !newEnd) return;
        onChange([...slots, { _key: newKey(), startTime: newStart, endTime: newEnd, isActive: true, _delete: false }]);
        setNewStart('');
        setNewEnd('');
    };

    return (
        <div className="space-y-3">
            {/* Mevcut slotlar */}
            {active.length === 0 && (
                <p className="text-slate-500 text-xs italic">Slot yok — aşağıdan ekleyebilirsiniz</p>
            )}
            <div className="flex flex-wrap gap-2">
                {active.map(slot => (
                    <div
                        key={slot._key}
                        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all
                            ${slot.isActive
                                ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                                : 'bg-slate-800/60 border-slate-700/60 text-slate-500'}`}
                    >
                        {slot.startTime}–{slot.endTime}
                        {/* Toggle */}
                        <button
                            onClick={() => toggle(slot._key)}
                            title={slot.isActive ? 'Pasif yap' : 'Aktif yap'}
                            className={`rounded-full p-0.5 transition-colors ${slot.isActive ? 'text-orange-400 hover:text-slate-400' : 'text-slate-600 hover:text-orange-400'}`}
                        >
                            {slot.isActive
                                ? <IconCheck size={10} />
                                : <IconClock size={10} />}
                        </button>
                        {/* Sil */}
                        <button
                            onClick={() => markDelete(slot._key)}
                            title="Slotu sil"
                            className="text-slate-600 hover:text-red-400 transition-colors rounded-full p-0.5"
                        >
                            <IconTrash size={10} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Yeni slot ekle */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                    <input
                        type="time"
                        value={newStart}
                        onChange={e => setNewStart(e.target.value)}
                        className="bg-[#253352] border border-slate-600/60 text-[#dde8f5] px-2 py-1 rounded-lg focus:outline-none focus:border-orange-500 text-xs"
                    />
                    <span className="text-slate-500 text-xs">–</span>
                    <input
                        type="time"
                        value={newEnd}
                        onChange={e => setNewEnd(e.target.value)}
                        className="bg-[#253352] border border-slate-600/60 text-[#dde8f5] px-2 py-1 rounded-lg focus:outline-none focus:border-orange-500 text-xs"
                    />
                </div>
                <button
                    onClick={addSlot}
                    disabled={!newStart || !newEnd}
                    className="flex items-center gap-1 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 px-3 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                >
                    <IconPlus size={11} /> Slot Ekle
                </button>
            </div>
        </div>
    );
};

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
    label: string; classes: string; Icon: React.FC<{ size?: number; className?: string }>;
}> = {
    active:    { label: 'Onaylandı',     classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', Icon: IconCheck },
    rejected:  { label: 'Reddedildi',    classes: 'bg-red-500/15 text-red-300 border-red-500/30',            Icon: IconX },
    suspended: { label: 'Askıya Alındı', classes: 'bg-slate-500/15 text-slate-300 border-slate-500/30',      Icon: IconPause },
    pending:   { label: 'Bekliyor',      classes: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',   Icon: IconPending },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminApplicationDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [app, setApp] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Edit state
    const [editMode, setEditMode] = useState(false);
    const [editBusiness, setEditBusiness] = useState<Record<string, string>>({});
    const [editOwner, setEditOwner] = useState<Record<string, string>>({});
    const [editPitches, setEditPitches] = useState<EditPitch[]>([]);

    useEffect(() => {
        adminApi.get(`/admin/applications/${id}`)
            .then(r => { setApp(r.data); initEditState(r.data); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    const initEditState = (data: any) => {
        setEditBusiness({
            name: data.name ?? '',
            city: data.city ?? '',
            district: data.district ?? '',
            address: data.address ?? '',
            phone: data.phone ?? '',
            openTime: data.openTime ?? '',
            closeTime: data.closeTime ?? '',
        });
        setEditOwner({
            fullName: data.owner?.fullName ?? '',
            email: data.owner?.email ?? '',
            phone: data.owner?.phone ?? '',
        });
        setEditPitches((data.pitches ?? []).map((p: any) => ({
            id: p.id,
            name: p.name ?? '',
            type: p.type ?? '',
            pricePerHour: p.pricePerHour?.toString() ?? '',
            facilities: parseFacilities(p.facilities),
            imageUrl: p.imageUrl ?? '',
            timeSlots: (p.timeSlots ?? []).map((s: any) => ({
                _key: s.id,
                id: s.id,
                startTime: s.startTime,
                endTime: s.endTime,
                isActive: s.isActive,
                _delete: false,
            })),
        })));
    };

    const updatePitch = (pitchId: string, changes: Partial<EditPitch>) =>
        setEditPitches(prev => prev.map(p => p.id === pitchId ? { ...p, ...changes } : p));

    const handleCancelEdit = () => { initEditState(app); setEditMode(false); };

    const saveChanges = async (): Promise<boolean> => {
        setActionLoading(true);
        try {
            const body = {
                business: editBusiness,
                owner: editOwner,
                pitches: editPitches.map(p => ({
                    id: p.id,
                    name: p.name,
                    type: p.type,
                    pricePerHour: parseFloat(p.pricePerHour) || undefined,
                    facilities: p.facilities,
                    imageUrl: p.imageUrl,
                    timeSlots: p.timeSlots.map(s => ({
                        id: s.id,
                        startTime: s.startTime,
                        endTime: s.endTime,
                        isActive: s.isActive,
                        _delete: s._delete,
                    })),
                })),
            };
            const res = await adminApi.patch(`/admin/applications/${id}`, body);
            setApp(res.data);
            initEditState(res.data);
            return true;
        } catch (err: any) {
            setMessage({ text: 'Hata: ' + (err.response?.data?.message || 'Değişiklikler kaydedilemedi.'), type: 'error' });
            return false;
        } finally {
            setActionLoading(false);
        }
    };

    const handleSave = async () => {
        const ok = await saveChanges();
        if (ok) { setEditMode(false); setMessage({ text: 'Değişiklikler başarıyla kaydedildi.', type: 'success' }); }
    };

    const handleSaveAndApprove = async () => {
        const ok = await saveChanges();
        if (!ok) return;
        setActionLoading(true);
        try {
            await adminApi.post(`/admin/applications/${id}/approve`);
            setApp((prev: any) => ({ ...prev, status: 'active', reviewedAt: new Date().toISOString() }));
            setEditMode(false);
            setMessage({ text: 'Değişiklikler kaydedildi ve işletme onaylandı.', type: 'success' });
        } catch (err: any) {
            setMessage({ text: 'Hata: ' + (err.response?.data?.message || 'Onaylama başarısız.'), type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const approve = async () => {
        setActionLoading(true);
        try {
            await adminApi.post(`/admin/applications/${id}/approve`);
            setMessage({ text: 'İşletme onaylandı.', type: 'success' });
            setApp((prev: any) => ({ ...prev, status: 'active', reviewedAt: new Date().toISOString() }));
        } catch (err: any) {
            setMessage({ text: 'Hata: ' + (err.response?.data?.message || 'Onaylama başarısız.'), type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const reject = async () => {
        if (!rejectReason.trim()) return;
        setActionLoading(true);
        try {
            await adminApi.post(`/admin/applications/${id}/reject`, { reason: rejectReason });
            setMessage({ text: 'İşletme reddedildi.', type: 'success' });
            setApp((prev: any) => ({ ...prev, status: 'rejected', rejectionReason: rejectReason, reviewedAt: new Date().toISOString() }));
            setShowRejectForm(false);
        } catch (err: any) {
            setMessage({ text: 'Hata: ' + (err.response?.data?.message || 'Reddetme başarısız.'), type: 'error' });
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
                <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-400 hover:text-[#dde8f5] text-sm font-bold transition-colors">
                    <IconChevronLeft size={16} />
                    Geri
                </button>
                <h1 className="text-xl font-black text-[#dde8f5]">{app.name}</h1>
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
                {!editMode ? (
                    <button
                        onClick={() => setEditMode(true)}
                        className="flex items-center gap-1.5 ml-auto bg-[#1e2d47] hover:bg-[#253352] border border-slate-600/50 text-slate-300 hover:text-orange-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    >
                        <IconEdit size={13} />
                        Düzenle
                    </button>
                ) : (
                    <div className="flex items-center gap-2 ml-auto">
                        <button onClick={handleCancelEdit} className="bg-white/5 hover:bg-white/10 border border-slate-600/50 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all">
                            İptal
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                        >
                            <IconSave size={13} />
                            {actionLoading ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                )}
            </div>

            {/* Mesaj */}
            {message && (
                <div className={`border p-4 rounded-xl mb-6 font-bold text-sm flex items-center gap-2 ${message.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                    {message.type === 'success' ? <IconCheck size={16} className="shrink-0" /> : <IconX size={16} className="shrink-0" />}
                    {message.text}
                    <button onClick={() => setMessage(null)} className="ml-auto opacity-60 hover:opacity-100"><IconX size={14} /></button>
                </div>
            )}

            <div className="space-y-4">
                {/* Yetkili + İşletme */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {app.owner && (
                        <Section title="Yetkili Bilgileri" icon={<IconUser size={13} />}>
                            <Row label="Ad Soyad"  value={editOwner.fullName} editMode={editMode} onChange={v => setEditOwner(p => ({ ...p, fullName: v }))} />
                            <Row label="E-posta"   value={editOwner.email}    editMode={editMode} onChange={v => setEditOwner(p => ({ ...p, email: v }))} type="email" />
                            <Row label="Telefon"   value={editOwner.phone}    editMode={editMode} onChange={v => setEditOwner(p => ({ ...p, phone: v }))} />
                        </Section>
                    )}
                    <Section title="İşletme Bilgileri" icon={<IconBuilding size={13} />}>
                        <Row label="İşletme Adı" value={editBusiness.name}     editMode={editMode} onChange={v => setEditBusiness(p => ({ ...p, name: v }))} />
                        <Row label="Şehir"        value={editBusiness.city}     editMode={editMode} onChange={v => setEditBusiness(p => ({ ...p, city: v }))} />
                        <Row label="İlçe"         value={editBusiness.district} editMode={editMode} onChange={v => setEditBusiness(p => ({ ...p, district: v }))} />
                        <Row label="Adres"        value={editBusiness.address}  editMode={editMode} onChange={v => setEditBusiness(p => ({ ...p, address: v }))} />
                        <Row label="Telefon"      value={editBusiness.phone}    editMode={editMode} onChange={v => setEditBusiness(p => ({ ...p, phone: v }))} />
                        {!editMode ? (
                            <Row label="Çalışma Saatleri" value={`${editBusiness.openTime || '–'} – ${editBusiness.closeTime || '–'}`} />
                        ) : (
                            <div className="flex gap-2 py-2">
                                <div className="flex-1">
                                    <p className="text-slate-400 text-xs mb-1">Açılış</p>
                                    <input type="time" value={editBusiness.openTime}
                                        onChange={e => setEditBusiness(p => ({ ...p, openTime: e.target.value }))}
                                        className="w-full bg-[#253352] border border-slate-600/60 text-[#dde8f5] px-2.5 py-1 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                                    />
                                </div>
                                <div className="flex-1">
                                    <p className="text-slate-400 text-xs mb-1">Kapanış</p>
                                    <input type="time" value={editBusiness.closeTime}
                                        onChange={e => setEditBusiness(p => ({ ...p, closeTime: e.target.value }))}
                                        className="w-full bg-[#253352] border border-slate-600/60 text-[#dde8f5] px-2.5 py-1 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </Section>
                </div>

                {/* Konum */}
                {app.latitude && app.longitude && (
                    <Section title="Konum" icon={<IconPin size={13} />}>
                        <div className="rounded-xl overflow-hidden border border-slate-700/60">
                            <iframe
                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${app.longitude - 0.005},${app.latitude - 0.005},${app.longitude + 0.005},${app.latitude + 0.005}&layer=mapnik&marker=${app.latitude},${app.longitude}`}
                                width="100%" height="220" style={{ border: 0 }} title="Konum"
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
                        <div className="space-y-5">
                            {app.pitches.map((pitch: any, i: number) => {
                                const ep = editPitches.find(p => p.id === pitch.id);
                                return (
                                    <div key={pitch.id} className="bg-[#253352] rounded-xl p-4 border border-slate-600/40 space-y-4">

                                        {/* Saha başlığı: isim, tür, fiyat */}
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <IconPitch size={14} className="text-orange-400 shrink-0" />
                                                {editMode && ep ? (
                                                    <input
                                                        value={ep.name}
                                                        onChange={e => updatePitch(pitch.id, { name: e.target.value })}
                                                        className="bg-[#1e2d47] border border-slate-600/60 text-orange-300 font-black text-sm px-2 py-1 rounded-lg focus:outline-none focus:border-orange-500 flex-1 min-w-0"
                                                    />
                                                ) : (
                                                    <h4 className="font-black text-orange-300 text-sm">{i + 1}. {pitch.name}</h4>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap shrink-0">
                                                {editMode && ep ? (
                                                    <>
                                                        <select
                                                            value={ep.type}
                                                            onChange={e => updatePitch(pitch.id, { type: e.target.value })}
                                                            className="bg-[#1e2d47] border border-slate-600/50 text-slate-300 text-xs font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-orange-500"
                                                        >
                                                            <option value="">Tür Seçin</option>
                                                            <option value="INDOOR">Kapalı</option>
                                                            <option value="OUTDOOR">Açık</option>
                                                        </select>
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                value={ep.pricePerHour}
                                                                onChange={e => updatePitch(pitch.id, { pricePerHour: e.target.value })}
                                                                className="w-20 bg-[#1e2d47] border border-slate-600/60 text-orange-300 font-black text-xs px-2 py-1 rounded-lg focus:outline-none focus:border-orange-500 text-right"
                                                            />
                                                            <span className="text-orange-300 text-xs font-bold">₺/saat</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        {pitch.type && (
                                                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-[#1e2d47] text-slate-300 border border-slate-600/50">
                                                                {pitch.type === 'INDOOR' ? <><IconIndoor size={11} /> Kapalı</> : <><IconOutdoor size={11} /> Açık</>}
                                                            </span>
                                                        )}
                                                        <span className="text-orange-300 text-xs font-bold">
                                                            {pitch.pricePerHour?.toLocaleString('tr-TR') || '–'} ₺/saat
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-600/30" />

                                        {/* Fotoğraf */}
                                        <div>
                                            <p className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wide flex items-center gap-1.5">
                                                <IconImage size={12} className="text-slate-500" />
                                                Fotoğraf
                                            </p>
                                            {editMode && ep ? (
                                                <div className="space-y-2">
                                                    {ep.imageUrl && (
                                                        <img src={ep.imageUrl} alt="Önizleme"
                                                            className="w-full h-36 object-cover rounded-lg border border-slate-600/50"
                                                            onError={e => (e.currentTarget.style.display = 'none')}
                                                        />
                                                    )}
                                                    <input
                                                        value={ep.imageUrl}
                                                        onChange={e => updatePitch(pitch.id, { imageUrl: e.target.value })}
                                                        placeholder="Fotoğraf URL'sini yapıştırın..."
                                                        className="w-full bg-[#1e2d47] border border-slate-600/60 text-[#dde8f5] px-3 py-1.5 rounded-lg focus:outline-none focus:border-orange-500 text-xs placeholder-slate-500"
                                                    />
                                                </div>
                                            ) : pitch.imageUrl ? (
                                                <img src={pitch.imageUrl} alt={pitch.name}
                                                    className="w-full h-36 object-cover rounded-lg border border-slate-600/50"
                                                />
                                            ) : (
                                                <p className="text-slate-500 text-xs italic">Fotoğraf yüklenmemiş</p>
                                            )}
                                        </div>

                                        <div className="border-t border-slate-600/30" />

                                        {/* İmkanlar */}
                                        <div>
                                            <p className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wide">İmkanlar</p>
                                            {editMode && ep ? (
                                                <FacilitiesEdit
                                                    facilities={ep.facilities}
                                                    onChange={f => updatePitch(pitch.id, { facilities: f })}
                                                />
                                            ) : (
                                                <FacilityChips facilities={pitch.facilities} />
                                            )}
                                        </div>

                                        <div className="border-t border-slate-600/30" />

                                        {/* Saat Slotları */}
                                        <div>
                                            <p className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wide">Saat Slotları</p>
                                            {editMode && ep ? (
                                                <TimeSlotsEdit
                                                    slots={ep.timeSlots}
                                                    onChange={s => updatePitch(pitch.id, { timeSlots: s })}
                                                />
                                            ) : (
                                                <>
                                                    {(!pitch.timeSlots || pitch.timeSlots.length === 0) ? (
                                                        <p className="text-slate-500 text-xs italic flex items-center gap-1">
                                                            <IconClock size={12} className="text-slate-600" />
                                                            Varsayılan saatler kullanılıyor
                                                        </p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {[...pitch.timeSlots]
                                                                    .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime))
                                                                    .map((slot: any) => (
                                                                        <span key={slot.id}
                                                                            className={`inline-block font-mono text-xs px-2 py-1 rounded-md border ${slot.isActive
                                                                                ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                                                                                : 'bg-slate-800/60 border-slate-700/60 text-slate-500 line-through opacity-50'}`}>
                                                                            {slot.startTime}–{slot.endTime}
                                                                        </span>
                                                                    ))}
                                                            </div>
                                                            <p className="text-slate-500 text-xs">
                                                                {pitch.timeSlots.filter((s: any) => s.isActive).length} aktif / {pitch.timeSlots.length} toplam
                                                            </p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Section>
                )}

                {/* Red Nedeni */}
                {app.rejectionReason && (
                    <Section title="Red Nedeni" icon={<IconX size={13} />}>
                        <p className="text-red-300 text-sm">{app.rejectionReason}</p>
                    </Section>
                )}

                {/* Aksiyon Butonları */}
                {editMode ? (
                    <div className="pt-2 space-y-3">
                        <div className="flex gap-3">
                            <button onClick={handleSave} disabled={actionLoading}
                                className="flex-1 flex items-center justify-center gap-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 py-3 rounded-xl font-black transition-colors disabled:opacity-50">
                                <IconSave size={16} />
                                {actionLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                            </button>
                            {isPending && (
                                <button onClick={handleSaveAndApprove} disabled={actionLoading}
                                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white py-3 rounded-xl font-black transition-colors">
                                    <IconCheck size={16} />
                                    {actionLoading ? 'İşleniyor...' : 'Kaydet ve Onayla'}
                                </button>
                            )}
                        </div>
                    </div>
                ) : isPending ? (
                    <div className="space-y-3 pt-2">
                        {!showRejectForm ? (
                            <div className="flex gap-3">
                                <button onClick={approve} disabled={actionLoading}
                                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white py-3 rounded-xl font-black transition-colors">
                                    <IconCheck size={16} />
                                    {actionLoading ? 'İşleniyor...' : 'Onayla'}
                                </button>
                                <button onClick={() => setShowRejectForm(true)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-red-600/15 hover:bg-red-600/25 border border-red-500/40 text-red-300 py-3 rounded-xl font-black transition-colors">
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
                                    <button onClick={() => setShowRejectForm(false)}
                                        className="flex-1 bg-white/5 text-slate-300 py-2 rounded-xl font-bold text-sm hover:bg-white/10 transition-colors">
                                        İptal
                                    </button>
                                    <button onClick={reject} disabled={actionLoading || !rejectReason.trim()}
                                        className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2 rounded-xl font-black text-sm transition-colors">
                                        <IconX size={14} />
                                        {actionLoading ? 'Gönderiliyor...' : 'Reddet'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
