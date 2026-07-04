import React from 'react';
import { Settings, LogOut, Edit2, Save } from 'lucide-react';
import { LevelBadge } from '../../../../components/UI/LevelBadge';
import { FairPlayScore } from '../../../../components/UI/FairPlayScore';
import { Team } from '../../../../types';

interface TeamHeaderCardProps {
    myTeam: Team;
    bio: string;
    setBio: (bio: string) => void;
    isCaptain: boolean;
    isEditingBio: boolean;
    setIsEditingBio: (isEditing: boolean) => void;
    handleSaveBio: () => void;
    setIsTeamMenuOpen: (isOpen: boolean) => void;
    handleLeaveTeam: () => void;
}

// Supports both hex values (#3b82f6) and legacy Tailwind class strings (bg-blue-500)
const LEGACY_COLOR_HEX: Record<string, string> = {
    'bg-blue-500': '#3b82f6', 'bg-green-500': '#22c55e', 'bg-red-500': '#ef4444',
    'bg-yellow-500': '#eab308', 'bg-purple-500': '#a855f7', 'bg-orange-500': '#f97316',
    'bg-pink-500': '#ec4899', 'bg-cyan-500': '#06b6d4', 'bg-white': '#ffffff',
};
const toHex = (val?: string) => {
    if (!val) return '#3b82f6';
    if (val.startsWith('#')) return val;
    return LEGACY_COLOR_HEX[val] ?? '#3b82f6';
};

export const TeamHeaderCard: React.FC<TeamHeaderCardProps> = ({
    myTeam, bio, setBio, isCaptain, isEditingBio, setIsEditingBio,
    handleSaveBio,
    setIsTeamMenuOpen, handleLeaveTeam
}) => {
    return (
        <div
            className="rounded-2xl p-4 sm:p-6 border border-slate-700 relative overflow-hidden"
            style={{
                background: `linear-gradient(135deg, ${toHex((myTeam as any).primaryColor)}18 0%, #1e293b 50%, ${toHex((myTeam as any).secondaryColor || (myTeam as any).primaryColor)}12 100%)`
            }}
        >
            {/* Color accent blobs */}
            <div
                className="absolute top-0 right-0 w-40 h-40 rounded-bl-full opacity-20"
                style={{ background: `radial-gradient(circle at top right, ${toHex((myTeam as any).primaryColor)}, transparent 70%)` }}
            />
            <div
                className="absolute bottom-0 left-0 w-28 h-28 rounded-tr-full opacity-10"
                style={{ background: `radial-gradient(circle at bottom left, ${toHex((myTeam as any).secondaryColor || (myTeam as any).primaryColor)}, transparent 70%)` }}
            />

            <div className="flex justify-between items-start relative z-10 gap-2">
                <div className="flex items-start gap-3 min-w-0">
                    <div
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center overflow-hidden shadow-xl shrink-0"
                        style={{ border: `3px solid ${toHex((myTeam as any).primaryColor)}60` }}
                    >
                        {(myTeam as any).logoUrl ? (
                            <img src={(myTeam as any).logoUrl} className="w-full h-full object-cover" alt="Logo"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center text-white font-black text-xl sm:text-2xl"
                                style={{ background: `linear-gradient(135deg, ${toHex((myTeam as any).primaryColor)}, ${toHex((myTeam as any).secondaryColor || (myTeam as any).primaryColor)}88)` }}
                            >
                                {myTeam.name?.slice(0, 2).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h2 className="font-sport font-black text-xl sm:text-2xl md:text-3xl text-white italic tracking-wide uppercase truncate">{myTeam.name}</h2>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <LevelBadge level={myTeam.level} />
                            <FairPlayScore score={myTeam.fairPlayScore} count={myTeam.fairPlayRatingCount} />
                            {(myTeam.id || (myTeam as any).shortId) && (
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-700">
                                    #{(myTeam as any).shortId || myTeam.id?.slice(0, 8).toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                        onClick={() => setIsTeamMenuOpen(true)}
                        className="p-1.5 sm:p-2 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700/50"
                        title="Takım Ayarları"
                    >
                        <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                        onClick={handleLeaveTeam}
                        className="p-1.5 sm:p-2 bg-slate-900/50 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors border border-slate-700/50"
                        title="Takımdan Ayrıl"
                    >
                        <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>
            </div>

            {/* Bio Section */}
            <div className="mt-6 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 group/bio">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-turf-500 text-xs font-bold uppercase tracking-widest">Takım Ruhu</span>
                    {isCaptain && !isEditingBio && (
                        <div className="flex gap-2">
                            <button onClick={() => setIsEditingBio(true)} className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                                <Edit2 className="w-3 h-3" /> Düzenle
                            </button>
                        </div>
                    )}
                </div>

                {isEditingBio ? (
                    <div className="animate-fade-in">
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full bg-slate-800 text-white text-sm p-3 rounded-lg border border-slate-600 focus:border-turf-500 focus:outline-none mb-2"
                            rows={3}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsEditingBio(false)} className="text-xs text-slate-400 hover:text-white px-2 py-1">İptal</button>
                            <button onClick={handleSaveBio} className="text-xs bg-turf-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 font-bold">
                                <Save className="w-3 h-3" /> Kaydet
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-slate-300 text-sm italic leading-relaxed">"{bio}"</p>
                )}
            </div>
        </div>
    );
};
