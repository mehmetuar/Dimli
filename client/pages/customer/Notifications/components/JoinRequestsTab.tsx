import React from 'react';
import { UserPlus, MapPin, Check, X } from 'lucide-react';
import { JoinRequest } from '../hooks/useNotifications';

interface JoinRequestsTabProps {
    joinRequests: JoinRequest[];
    setSelectedJoinRequest: (req: JoinRequest) => void;
    handleAccept: (id: string) => void;
    handleReject: (id: string) => void;
}

export const JoinRequestsTab: React.FC<JoinRequestsTabProps> = ({ joinRequests, setSelectedJoinRequest, handleAccept, handleReject }) => {
    if (joinRequests.length === 0) {
        return (
            <div className="text-center py-12 opacity-50">
                <UserPlus className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Bekleyen katılma isteği yok.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {joinRequests.map(request => (
                <div
                    key={request.id}
                    className="p-4 rounded-2xl border flex gap-4 items-center transition-all cursor-pointer group relative overflow-hidden bg-slate-800 border-slate-700 hover:border-turf-500/50 hover:bg-slate-800/80"
                    onClick={() => setSelectedJoinRequest(request)}
                >
                    <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none"></div>
                    <div className="relative">
                        <img
                            src={`https://ui-avatars.com/api/?name=${request.user.full_name || request.user.username}&background=0D8ABC&color=fff`}
                            alt={request.user.username}
                            className="w-16 h-16 rounded-full object-cover border-2 border-slate-600 group-hover:border-turf-500 transition-colors"
                        />
                    </div>
                    <div className="flex-1 min-w-0 relative z-10">
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-white text-lg truncate group-hover:text-turf-400 transition-colors">
                                {request.user.full_name || request.user.username}
                            </h3>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                                {new Date(request.createdAt).toLocaleDateString('tr-TR')}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5 mb-2">
                            <MapPin className="w-3 h-3 text-turf-600" /> İstanbul
                        </div>
                        {request.message && (
                            <p className="text-xs text-slate-300 italic mb-2 line-clamp-1">"{request.message}"</p>
                        )}
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAccept(request.id);
                                }}
                                className="flex-1 py-1.5 bg-turf-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20"
                            >
                                <Check className="w-3 h-3" /> Kabul Et
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleReject(request.id);
                                }}
                                className="flex-1 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-900/50 hover:text-red-400 transition-colors"
                            >
                                <X className="w-3 h-3" /> Reddet
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
