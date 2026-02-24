import React from 'react';
import { X, MapPin, Handshake, Star, MessageCircle, UserPlus, Edit } from 'lucide-react';
import { Player } from '../types';
import { MOCK_PITCHES } from '../constants';
import { getBusinesses } from '../services/api';

interface PlayerDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: Player | null;
    isMe?: boolean;
    onMessage?: (player: Player) => void;
    onInvite?: (player: Player) => void;
    onEdit?: () => void;
    onAccept?: () => void;
    onReject?: () => void;
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
    isOpen,
    onClose,
    player,
    isMe = false,
    onMessage,
    onInvite,

    onEdit,
    onAccept,
    onReject
}) => {
    if (!isOpen || !player) return null;

    const [businesses, setBusinesses] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (isOpen) {
            getBusinesses().then(setBusinesses).catch(console.error);
        }
    }, [isOpen]);

    // Resolve favorite pitches/businesses (Check both keys to be safe with Player type vs User entity)
    const activeFavorites = (player.favoriteBusinessIds || player.favoritePitchIds || []);
    const favoriteItems = activeFavorites.map(id =>
        businesses.find(b => b.id === id)
    ).filter(Boolean);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/95 backdrop-blur-md animate-fade-in overflow-y-auto py-10">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="fixed top-12 right-4 bg-white/10 p-3 rounded-full text-white hover:bg-red-600 transition-colors z-50 backdrop-blur"
            >
                <X className="w-6 h-6" />
            </button>

            <div className="w-full max-w-sm relative">
                {/* Card Container */}
                <div className="relative bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 rounded-[2rem] overflow-hidden border-[3px] border-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.15)]">

                    {/* Decorative Shine */}
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent z-0"></div>

                    {/* Card Header */}
                    <div className="relative z-10 pt-6 px-6 pb-0 flex justify-between items-start">
                        <div className="flex flex-col pt-4">
                            <span className="text-xl font-bold text-slate-300 uppercase tracking-widest">{player.position}</span>
                            <div className="mt-2 flex items-center gap-1">
                                <img src="https://flagcdn.com/w40/tr.png" className="w-6 h-4 rounded shadow" alt="TR" />
                            </div>
                        </div>
                        <div className="w-40 h-40 relative -mr-4 -mt-2">
                            <img
                                src={player.avatarUrl || `https://ui-avatars.com/api/?name=${player.name}&background=0D8ABC&color=fff`}
                                className="w-full h-full object-cover rounded-full border-4 border-slate-800/50 shadow-2xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] aspect-square"
                                alt={player.name}
                            />
                        </div>
                    </div>

                    {/* Name */}
                    <div className="relative z-10 text-center mt-6 mb-4">
                        <h2 className="font-sport font-black text-4xl text-white uppercase italic tracking-tighter drop-shadow-md">
                            {player.name}
                        </h2>
                        <div className="flex justify-center items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide">
                            <MapPin className="w-3 h-3 text-turf-500" /> {player.location || 'Konum Belirtilmemiş'}
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="relative z-10 px-6 pb-6">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {/* Age */}
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">YAŞ</span>
                                <span className="font-sport text-2xl font-black text-white">
                                    {player.birthDate ? new Date().getFullYear() - new Date(player.birthDate).getFullYear() : '-'}
                                </span>
                            </div>
                            {/* Foot */}
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">AYAK</span>
                                <span className="font-sport text-xl font-black text-white uppercase">{player.foot || '-'}</span>
                            </div>
                            {/* Position */}
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">MEVKİ</span>
                                <span className="font-sport text-lg font-black text-white uppercase">{player.position}</span>
                            </div>
                            {/* Secondary Position */}
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">YAN MEVKİ</span>
                                <span className="font-sport text-lg font-black text-slate-300 uppercase">{player.secondaryPosition || '-'}</span>
                            </div>
                        </div>



                        {/* Favorite Businesses */}
                        <div className="mb-6">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-500" /> Favori İşletmeler
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {favoriteItems && favoriteItems.length > 0 ? (
                                    favoriteItems.map((item: any) => (
                                        <span key={item?.id} className="text-xs font-bold text-slate-300 bg-white/5 px-2 py-1 rounded border border-white/10">
                                            {item?.name}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-slate-500 italic">Favori işletme seçimi yok.</span>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {!isMe && (
                            <div className="grid grid-cols-5 gap-2">
                                {(onAccept || onReject) ? (
                                    <>
                                        {onReject && (
                                            <button
                                                onClick={onReject}
                                                className="col-span-2 bg-slate-700 hover:bg-red-900/50 hover:text-red-400 text-slate-300 font-bold py-3 rounded-xl flex items-center justify-center gap-1 transition-colors"
                                            >
                                                <X className="w-4 h-4" /> Reddet
                                            </button>
                                        )}
                                        {onAccept && (
                                            <button
                                                onClick={onAccept}
                                                className="col-span-3 bg-gradient-to-r from-turf-600 to-green-500 text-white font-black text-lg uppercase italic py-3 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-turf-500/30 flex items-center justify-center gap-2"
                                            >
                                                <UserPlus className="w-5 h-5" /> Kabul Et
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {onMessage && (
                                            <button
                                                onClick={() => onMessage(player)}
                                                className="col-span-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl flex items-center justify-center transition-colors"
                                            >
                                                <MessageCircle className="w-6 h-6" />
                                            </button>
                                        )}
                                        {onInvite && (
                                            <button
                                                onClick={() => onInvite(player)}
                                                className="col-span-4 bg-gradient-to-r from-turf-600 to-green-500 text-white font-black text-lg uppercase italic py-3 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-turf-500/30 flex items-center justify-center gap-2"
                                            >
                                                <UserPlus className="w-5 h-5" /> Maça Davet Et
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                        {isMe && onEdit && (
                            <button
                                onClick={onEdit}
                                className="w-full bg-slate-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-600"
                            >
                                <Edit className="w-4 h-4" /> Profili Düzenle
                            </button>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};
