import React from 'react';
import { MapPin, Handshake } from 'lucide-react';

interface JokerCardProps {
    player: any;
    currentUser: any;
    onClick: () => void;
}

export const JokerCard: React.FC<JokerCardProps> = ({ player, currentUser, onClick }) => {
    const isMe = currentUser && player.id === currentUser.id;
    const displayName = player.full_name || player.username;
    const avatarSrc = player.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1a2e35&color=4ade80&size=128`;

    return (
        <div
            onClick={onClick}
            className={`p-4 rounded-2xl border flex gap-4 items-center transition-all cursor-pointer group relative overflow-hidden ${isMe
                ? 'bg-slate-800/80 border-turf-500/50'
                : 'bg-slate-800 border-slate-700 hover:border-turf-500/50 hover:bg-slate-800/80'
                }`}
        >
            {/* Highlight Effect */}
            <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-black/20 to-transparent pointer-events-none"></div>

            <div className="relative">
                <img
                    src={avatarSrc}
                    alt={displayName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-600 group-hover:border-turf-500 transition-colors"
                />
            </div>
            <div className="flex-1 min-w-0 relative z-10">
                <h3 className="font-bold text-white text-lg truncate group-hover:text-turf-400 transition-colors">
                    {displayName} {isMe && '(Sen)'}
                </h3>
                <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5 mb-2">
                    <MapPin className="w-3 h-3 text-turf-600" /> {player.location || 'Konum yok'}
                </div>
                <div className="flex justify-between items-center">
                    <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${player.position === 'KALECİ' || player.position === 'GK'
                        ? 'bg-yellow-500/20 text-yellow-500'
                        : 'bg-slate-700 text-slate-300'
                        }`}>
                        {player.position || 'Belirsiz'}
                    </span>

                    {player.sharesFee && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-turf-500 bg-turf-900/20 px-2 py-1 rounded-full">
                            <Handshake className="w-3 h-3" /> Ortak
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
