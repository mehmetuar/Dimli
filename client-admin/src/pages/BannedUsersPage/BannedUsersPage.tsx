import React from 'react';
import { IconBan, IconUser, IconCheck, IconAlertCircle, IconClock } from '../../components/Icons';
import { useBannedUsers, BannedUser } from './hooks/useBannedUsers';

// ─── Yardımcı: tarih formatı ──────────────────────────────────────────────────

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('tr-TR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

const fmtRemaining = (expiryIso: string): string => {
    const diff = new Date(expiryIso).getTime() - Date.now();
    if (diff <= 0) return 'Süresi doldu';
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h >= 24) return `${Math.floor(h / 24)} gün ${h % 24} saat`;
    if (h > 0)   return `${h} saat ${m} dakika`;
    return `${m} dakika`;
};

// ─── Kart ─────────────────────────────────────────────────────────────────────

const BannedUserCard: React.FC<{
    user: BannedUser;
    isProcessing: boolean;
    onUnban: () => void;
}> = ({ user, isProcessing, onUnban }) => {
    const isPermanent = !user.chatBanExpiry;
    const name = user.full_name || user.username || 'Bilinmiyor';

    return (
        <div className="bg-[#1e2d47] border border-slate-700/40 rounded-2xl p-5 flex items-center gap-4">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-sm font-black text-red-300 shrink-0">
                {name.charAt(0).toUpperCase()}
            </div>

            {/* Bilgi */}
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#dde8f5] font-black text-sm">{name}</span>
                    {user.username && (
                        <span className="text-slate-500 text-xs">@{user.username}</span>
                    )}
                    {isPermanent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                            Kalıcı
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-500">
                    {user.chatBannedAt && (
                        <span>
                            <span className="text-slate-600">Başlangıç:</span>{' '}
                            <span className="text-slate-400">{fmtDate(user.chatBannedAt)}</span>
                        </span>
                    )}
                    {!isPermanent && user.chatBanExpiry && (
                        <>
                            <span>
                                <span className="text-slate-600">Bitiş:</span>{' '}
                                <span className="text-slate-400">{fmtDate(user.chatBanExpiry)}</span>
                            </span>
                            <span className="flex items-center gap-1 text-amber-400/80">
                                <IconClock size={10} />
                                {fmtRemaining(user.chatBanExpiry)} kaldı
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Yasağı Kaldır */}
            <button
                onClick={onUnban}
                disabled={isProcessing}
                className="shrink-0 px-3 py-2 rounded-xl text-xs font-black bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
                <IconUser size={12} />
                Yasağı Kaldır
            </button>
        </div>
    );
};

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

const BannedUsersPage: React.FC = () => {
    const { users, loading, processing, toast, handleUnban } = useBannedUsers();

    return (
        <div className="p-6 max-w-4xl mx-auto">

            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-2 border
                    ${toast.type === 'success'
                        ? 'bg-emerald-900/90 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-900/90 border-red-500/40 text-red-300'}`}
                >
                    {toast.type === 'success' ? <IconCheck size={14} /> : <IconAlertCircle size={14} />}
                    {toast.text}
                </div>
            )}

            {/* Başlık */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <IconBan size={18} className="text-red-400" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-[#dde8f5]">Chat Yasakları</h1>
                    <p className="text-[#7b9ab8] text-xs">Aktif mesaj yasağı olan kullanıcılar</p>
                </div>
                {!loading && (
                    <span className="ml-auto text-[#7b9ab8] text-sm font-bold">{users.length} kullanıcı</span>
                )}
            </div>

            {/* Liste */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white/5 border border-slate-700/40 rounded-2xl p-5 animate-pulse h-20" />
                    ))}
                </div>
            ) : users.length === 0 ? (
                <div className="text-center py-24">
                    <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
                        <IconBan size={28} className="text-slate-600" />
                    </div>
                    <p className="font-bold text-[#dde8f5] mb-1">Banlı kullanıcı yok</p>
                    <p className="text-[#7b9ab8] text-sm">Şu an aktif chat yasağı olan kullanıcı bulunmuyor.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {users.map(user => (
                        <BannedUserCard
                            key={user.id}
                            user={user}
                            isProcessing={processing === user.id}
                            onUnban={() => handleUnban(user.id, user.full_name || user.username)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default BannedUsersPage;
