
import React, { useState } from 'react';
import { X, Search, UserPlus, CheckCircle, AlertCircle, Share2 } from 'lucide-react';
import { Browser } from '@capacitor/browser';

import api from '../../../../services/api';
import { KeyboardAwareModal } from '../../../../components/Modals/KeyboardAwareModal';
import { getToken, decodeTokenPayload } from '../../../../services/authStorage';
import { normalizeUsername } from '../../../../utils/username';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentRosterIds: string[];
    teamId?: string;
    teamShortId?: string;
    teamName?: string;
}

// Arama sonucu — /users/search'ün döndürdüğü herkese-açık alanlar.
interface SearchUser {
    id: string;
    name: string;
    username: string;
    position?: string;
    location?: string;
    avatarUrl: string;
}

export const AddPlayerModal: React.FC<Props> = (props) => {
    if (!props.isOpen) return null;
    return <AddPlayerModalContent {...props} />;
};

const AddPlayerModalContent: React.FC<Props> = ({ isOpen, onClose, currentRosterIds, teamId, teamShortId, teamName }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [invitedIds, setInvitedIds] = useState<string[]>([]);
    const [showInviteLink, setShowInviteLink] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        setInviteError(null);
        // Görünen inputa dokunmadan normalize et — "IŞIK34" araması "isik34"ü bulur
        const normalized = normalizeUsername(term);
        if (!normalized) {
            setSearchResults([]);
            return;
        }

        try {
            const response = await api.get(`/users/search?q=${encodeURIComponent(normalized)}`);
            // Zaten kadroda olanları ele
            const results = response.data.filter((u: any) => !currentRosterIds.includes(u.id));

            // Backend kullanıcısını karta eşle — GERÇEK avatar (yoksa baş harf), sahte fallback yok.
            const mappedResults: SearchUser[] = results.map((u: any) => ({
                id: u.id,
                name: u.full_name || u.username,
                username: u.username,
                position: u.position || undefined,
                location: u.location || undefined,
                avatarUrl:
                    u.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || u.username)}&background=1e293b&color=4ade80`,
            }));
            setSearchResults(mappedResults);
        } catch (error) {
            console.error("Search failed", error);
        }
    };

    const handleInvite = async (userId: string) => {
        if (!teamId) return;
        setInviteError(null);
        try {
            await api.post(`/teams/${teamId}/players`, { userId });
            setInvitedIds(prev => [...prev, userId]);
            // Button will now show "Davet Gönderildi" and turn gray
        } catch (error: any) {
            // Native "Internal server error" popup yerine modal-içi şık uyarı
            // (ör. "Bu oyuncunun zaten bir takımı var.").
            setInviteError(error.response?.data?.message || 'Davet gönderilemedi.');
        }
    };

    const getInviteLink = () => {
        const token = getToken();
        const ref = token ? decodeTokenPayload(token)?.sub : undefined;
        const code = teamShortId || teamId;
        return `https://www.dimli.com.tr/invite/team/${code}${ref ? `?ref=${ref}` : ''}`;
    };

    const getInviteMessage = () => {
        const link = getInviteLink();
        const name = teamName ? `${teamName} takımına` : 'takımıma';
        return `Dimli'de ${name} katıl, birlikte maç yapalım! ${link}`;
    };

    const copyInviteLink = () => {
        navigator.clipboard.writeText(getInviteLink());
        alert("Davet linki kopyalandı! Arkadaşına gönderebilirsin.");
    };

    const shareInviteLink = async () => {
        const message = getInviteMessage();
        if (navigator.share) {
            try {
                await navigator.share({ text: message });
            } catch {
                // Kullanıcı paylaşım menüsünü kapattı
            }
            return;
        }
        await Browser.open({ url: `https://wa.me/?text=${encodeURIComponent(message)}` });
    };

    return (
        <KeyboardAwareModal
            isOpen={isOpen}
            portalToBody
            zClassName="z-[70]"
            backdropClassName="bg-black/90 backdrop-blur-sm animate-fade-in"
            panelClassName="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl"
            maxHeightClassName="max-h-[80vh]"
            bodyClassName="p-6 space-y-6"
            header={
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
            }
        >
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

                    {/* Davet uyarısı (ör. oyuncunun zaten takımı var) — native error popup yerine */}
                    {inviteError && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{inviteError}</span>
                        </div>
                    )}

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
                                <div key={user.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-900 border border-slate-700">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full bg-slate-800 object-cover flex-shrink-0" />
                                        <div className="min-w-0">
                                            <div className="text-white font-bold text-sm truncate">{user.name}</div>
                                            <div className="text-xs truncate">
                                                <span className="text-turf-400 font-semibold">@{user.username}</span>
                                                {user.location && <span className="text-slate-500 uppercase"> • {user.location}</span>}
                                            </div>
                                            {user.position && <div className="text-[10px] text-slate-500 uppercase truncate mt-0.5">{user.position}</div>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleInvite(user.id)}
                                        disabled={isInvited}
                                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${isInvited
                                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
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
                                    {getInviteLink()}
                                </div>
                                <button
                                    onClick={copyInviteLink}
                                    className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                                >
                                    Kopyala
                                </button>
                            </div>
                            <button
                                onClick={shareInviteLink}
                                className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-neon"
                            >
                                <Share2 className="w-3.5 h-3.5" /> Paylaş
                            </button>
                            <p className="text-[10px] text-slate-500 mt-2">
                                Bu linki WhatsApp veya sosyal medyadan paylaşarak takımına oyuncu çekebilirsin.
                            </p>
                        </div>
                    )}
        </KeyboardAwareModal>
    );
};
