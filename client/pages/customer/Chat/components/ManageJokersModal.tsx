import React, { useState, useEffect } from 'react';
import { Shield, X, UserMinus, AlertTriangle } from 'lucide-react';
import api from '../../../../services/api';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';
import { userAvatarFallback } from '../utils/chatUtils';
import { realAvatarUrl } from './UserAvatar';

interface ManageJokersModalProps {
    isOpen: boolean;
    onClose: () => void;
    channelId: string;
}

export const ManageJokersModal: React.FC<ManageJokersModalProps> = ({ isOpen, onClose, channelId }) => {
    const [jokers, setJokers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRemoving, setIsRemoving] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && channelId) {
            fetchJokers();
        }
    }, [isOpen, channelId]);

    const fetchJokers = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/chat/channels/${channelId}/jokers`);
            setJokers(response.data);
        } catch (error) {
            console.error('Failed to fetch jokers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveJoker = async (jokerId: string) => {
        if (!window.confirm("Bu oyuncuyu maçtan çıkarmak istediğinize emin misiniz?")) return;

        setIsRemoving(jokerId);
        try {
            await api.delete(`/chat/channels/${channelId}/jokers/${jokerId}`);
            setJokers(prev => prev.filter(j => j.id !== jokerId));
        } catch (error: any) {
            console.error('Failed to remove joker:', error);
            alert(error.response?.data?.message || 'Oyuncu çıkarılamadı.');
        } finally {
            setIsRemoving(null);
        }
    };

    useModalBodyClass(isOpen);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col relative">
                <div className="flex justify-between items-center p-5 border-b border-slate-700/50 bg-slate-800/80">
                    <h3 className="text-white font-bold text-xl flex items-center gap-2">
                        <Shield className="w-5 h-5 text-turf-500" /> Joker Yönetimi
                    </h3>
                    <button
                        onClick={onClose}
                        className="bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full p-2 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto max-h-[60vh]">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-4 border-turf-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : jokers.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-700">
                                <UserMinus className="w-8 h-8 text-slate-600" />
                            </div>
                            <p>Bu maçta hiç joker oyuncu bulunmuyor.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-orange-400 mb-4 bg-orange-500/10 p-3 rounded-xl border border-orange-500/20 flex gap-2">
                                <AlertTriangle className="w-6 h-6 shrink-0" />
                                Joker oyuncuyu maçtan çıkardığınızda, sohbete erişimini de kesmiş olursunuz.
                            </p>

                            {jokers.map(joker => {
                                const displayName = joker.full_name || joker.username || joker.name || 'Joker';
                                const avatarSrc = realAvatarUrl(joker.avatarUrl) || userAvatarFallback(displayName);
                                return (
                                    <div key={joker.id} className="bg-slate-900 border border-slate-700 p-3 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img src={avatarSrc} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold text-sm">{displayName}</span>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-turf-400">{joker.position || joker.role || 'Joker'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveJoker(joker.id)}
                                            disabled={isRemoving === joker.id}
                                            className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors shrink-0 disabled:opacity-50"
                                        >
                                            {isRemoving === joker.id ? '...' : 'Kadrodan Çıkar'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
