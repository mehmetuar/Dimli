import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldOff, Loader2, UserX } from 'lucide-react';
import { getBlockedUsers, unblockUser, BlockedUser } from '../../../services/userBlocksService';

export const BlockedUsersPage: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [unblocking, setUnblocking] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (text: string) => {
        setToast(text);
        setTimeout(() => setToast(null), 3000);
    };

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getBlockedUsers();
            setUsers(data);
        } catch {
            // sessiz
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleUnblock = async (user: BlockedUser) => {
        setUnblocking(user.id);
        try {
            await unblockUser(user.id);
            setUsers(prev => prev.filter(u => u.id !== user.id));
            showToast(`${user.full_name} engeli kaldırıldı.`);
        } catch {
            showToast('Engel kaldırılamadı. Tekrar deneyin.');
        } finally {
            setUnblocking(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-pitch flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

            {/* Toast */}
            {toast && (
                <div className="fixed top-20 left-4 right-4 z-10 px-4 py-3 rounded-2xl bg-slate-800 border border-slate-600 text-slate-200 text-sm font-semibold shadow-xl animate-fade-in">
                    {toast}
                </div>
            )}

            {/* Header */}
            <header className="bg-pitch/95 backdrop-blur-sm border-b border-slate-800/60">
                <div className="flex items-center gap-3 px-4 py-4 max-w-lg mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="font-sport font-black text-2xl text-white italic tracking-wide uppercase">
                            Engellenen Kullanıcılar
                        </h1>
                        {!loading && (
                            <p className="text-slate-500 text-xs mt-0.5">{users.length} kullanıcı engellendi</p>
                        )}
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                <div className="max-w-lg mx-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                                <UserX className="w-7 h-7 text-slate-600" />
                            </div>
                            <p className="text-slate-300 font-bold text-base mb-1">Engellenen kullanıcı yok</p>
                            <p className="text-slate-500 text-sm">Engellediğiniz kullanıcılar burada görünür.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-800/60">
                            {users.map(user => (
                                <li key={user.id} className="flex items-center gap-3 px-4 py-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-sm font-black text-white">
                                        {user.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-bold text-sm truncate">{user.full_name}</p>
                                        <p className="text-slate-500 text-xs truncate">@{user.username}</p>
                                    </div>
                                    <button
                                        onClick={() => handleUnblock(user)}
                                        disabled={unblocking === user.id}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-600 bg-slate-800 text-slate-300 hover:border-turf-500/50 hover:text-turf-400 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 shrink-0"
                                    >
                                        {unblocking === user.id
                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            : <ShieldOff className="w-3.5 h-3.5" />}
                                        Engeli Kaldır
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};
