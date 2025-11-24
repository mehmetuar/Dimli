
import React, { useState } from 'react';
import { X, Search, UserPlus, CheckCircle, AlertCircle, Share2 } from 'lucide-react';
import { Player } from '../types';

import api from '../services/api';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentRosterIds: string[];
    teamId?: string;
}

export const AddPlayerModal: React.FC<Props> = ({ isOpen, onClose, currentRosterIds, teamId }) => {
    if (!isOpen) return null;

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Player[]>([]);
    const [invitedIds, setInvitedIds] = useState<string[]>([]);
    const [showInviteLink, setShowInviteLink] = useState(false);

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (!term.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const response = await api.get(`/users/search?q=${term}`);
            // Filter out already in roster
            const results = response.data.filter((u: any) => !currentRosterIds.includes(u.id));

            // Map backend user to frontend Player type
            const mappedResults = results.map((u: any) => ({
                id: u.id,
                name: u.full_name || u.username,
                position: u.position || 'Orta Saha',
                location: u.location || 'İstanbul',
                avatarUrl: 'https://picsum.photos/100/100?random=' + u.id,
            }));
            setSearchResults(mappedResults);
        } catch (error) {
            console.error("Search failed", error);
        }
    };

    const handleInvite = async (userId: string) => {
        if (!teamId) return;
        try {
            await api.post(`/teams/${teamId}/players`, { userId });
            setInvitedIds(prev => [...prev, userId]);
            alert("Oyuncu takıma eklendi!");
            // Ideally we should callback to refresh roster
            window.location.reload(); // Quick fix to refresh data
        } catch (error: any) {
            alert(error.response?.data?.message || "Davet edilemedi.");
        }
    };

    const copyInviteLink = () => {
        const link = `https://sahapro.app/invite/team/${teamId}`;
        navigator.clipboard.writeText(link);
        alert("Davet linki kopyalandı! Arkadaşına gönderebilirsin.");
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/90 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">

                {/* Header */}
                <div className="p-5 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
                    <div>
                        <h2 className="font-sport font-black text-2xl text-white italic uppercase tracking-wide">
                            OYUNCU <span className="text-turf-500">EKLE</span>
                        </h2>
                        <p className="text-slate-400 text-xs">Takımı güçlendir, arkadaşlarını çağır.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto">

                    {/* Search Input */}
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Kullanıcı adı veya isim ara..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-turf-500 focus:outline-none"
                            autoFocus
                        />
                        <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                    </div>

                    {/* Results List */}
                    <div className="space-y-2">
                        {searchTerm && searchResults.length === 0 && (
                            <div className="text-center py-6 bg-slate-900/50 rounded-xl border border-slate-700/50 border-dashed">
                                <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                <p className="text-slate-400 text-sm">Kullanıcı bulunamadı.</p>
                                <button
                                    onClick={() => setShowInviteLink(true)}
                                    className="mt-3 text-turf-500 text-xs font-bold hover:underline"
                                >
                                    Uygulamada yok mu? Link gönder!
                                </button>
                            </div>
                        )}

                        {searchResults.map(user => {
                            const isInvited = invitedIds.includes(user.id);
                            return (
                                <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <img src={user.avatarUrl} className="w-10 h-10 rounded-full bg-slate-800 object-cover" />
                                        <div>
                                            <div className="text-white font-bold text-sm">{user.name}</div>
                                            <div className="text-[10px] text-slate-500 uppercase">{user.position} • {user.location}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleInvite(user.id)}
                                        disabled={isInvited}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${isInvited
                                            ? 'bg-green-500/20 text-green-500 cursor-default'
                                            : 'bg-turf-600 text-white hover:bg-turf-500 shadow-neon'
                                            }`}
                                    >
                                        {isInvited ? <CheckCircle className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                                        {isInvited ? 'Davet Edildi' : 'Davet Et'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Invite Link Section (Growth Hacking) */}
                    {(showInviteLink || (!searchTerm && searchResults.length === 0)) && (
                        <div className="pt-4 border-t border-slate-700 mt-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                <Share2 className="w-4 h-4" /> Arkadaşını Davet Et
                            </h4>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 truncate">
                                    https://sahapro.app/invite/team/t1...
                                </div>
                                <button
                                    onClick={copyInviteLink}
                                    className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                                >
                                    Kopyala
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">
                                Bu linki WhatsApp veya sosyal medyadan paylaşarak takımına oyuncu çekebilirsin.
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
