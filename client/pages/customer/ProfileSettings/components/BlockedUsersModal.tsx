import React, { useState, useEffect, useCallback } from 'react';
import { X, ShieldOff, Loader2, UserX } from 'lucide-react';
import { getBlockedUsers, unblockUser, BlockedUser } from '../../../../services/userBlocksService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const BlockedUsersModal: React.FC<Props> = ({ isOpen, onClose }) => {
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
        if (isOpen) fetchUsers();
    }, [isOpen, fetchUsers]);

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex flex-col bg-pitch-surface">
            {/* Toast */}
            {toast && (
                <div className="fixed top-14 left-4 right-4 z-[90] px-4 py-3 rounded-2xl bg-slate-800 border border-slate-600 text-slate-200 text-sm font-semibold shadow-xl animate-fade-in">
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-slate-800">
                <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-white font-black text-base">Engellenen Kullanıcılar</h2>
                    <p className="text-slate-500 text-xs">{users.length} kullanıcı engellendi</p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
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
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-sm font-black text-white">
                                    {user.full_name.charAt(0).toUpperCase()}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-sm truncate">{user.full_name}</p>
                                    <p className="text-slate-500 text-xs truncate">@{user.username}</p>
                                </div>

                                {/* Unblock button */}
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
    );
};
