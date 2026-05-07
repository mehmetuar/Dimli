import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X, UserPlus, UserX, UserCheck, ShieldCheck, Swords, Clock, XCircle, ShieldAlert, Handshake, MessageCircle, MessageSquare } from 'lucide-react';
import { Notification } from '../hooks/useNotifications';

interface NotificationItemProps {
    notif: Notification;
    handleRejectChallenge: (id: string) => void;
    handleAcceptChallenge: (id: string) => void;
    handleAcceptRematchFromNotif: (n: Notification) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
    notif, handleRejectChallenge, handleAcceptChallenge, handleAcceptRematchFromNotif
}) => {
    const navigate = useNavigate();

    const getBorderClass = (type: string, metaType?: string) => {
        if (type === 'JOIN_REQUEST') return 'bg-blue-500';
        if (type === 'JOIN_REQUEST_ACCEPTED') return 'bg-turf-500';
        if (type === 'TEAM_KICKED') return 'bg-red-500';
        if (type === 'CHALLENGE') return 'bg-turf-500';
        if (type === 'REMATCH_PROPOSAL') return 'bg-purple-500';
        if (type === 'MATCH_REMINDER') return 'bg-yellow-500';
        if (metaType === 'MATCH_REJECTED_PASSIVE' || metaType === 'MATCH_CANCELLED_BY_CAPTAIN') return 'bg-red-500';
        if (metaType === 'MATCH_REVOKED_TO_PENDING') return 'bg-orange-500';
        if (metaType === 'BUSINESS_NOTE') return 'bg-slate-400';
        return 'bg-slate-500';
    };

    const getIconContainerClass = (type: string, metaType?: string) => {
        if (type === 'JOIN_REQUEST') return 'bg-blue-500/20 text-blue-500';
        if (type === 'JOIN_REQUEST_ACCEPTED') return 'bg-turf-500/20 text-turf-500';
        if (type === 'TEAM_KICKED') return 'bg-red-500/20 text-red-500';
        if (type === 'CHALLENGE' || metaType === 'MATCH_APPROVED') return 'bg-turf-500/20 text-turf-500';
        if (type === 'REMATCH_PROPOSAL') return 'bg-purple-500/20 text-purple-500';
        if (type === 'MATCH_REMINDER') return 'bg-yellow-500/20 text-yellow-500';
        if (metaType === 'MATCH_REJECTED_PASSIVE' || metaType === 'MATCH_CANCELLED_BY_CAPTAIN') return 'bg-red-500/20 text-red-500';
        if (metaType === 'MATCH_REVOKED_TO_PENDING') return 'bg-orange-500/20 text-orange-500';
        if (metaType === 'PROPOSAL_ACTION' || metaType === 'MATCH_RESTORED_TO_PENDING') return 'bg-slate-200/20 text-slate-100';
        if (metaType === 'BUSINESS_NOTE') return 'bg-slate-600/50 text-slate-300';
        return 'bg-slate-700 text-slate-400';
    };

    const renderIcon = (type: string, metaType?: string) => {
        if (type === 'JOIN_REQUEST') return <UserPlus className="w-4 h-4" />;
        if (type === 'JOIN_REQUEST_ACCEPTED') return <UserCheck className="w-4 h-4" />;
        if (type === 'TEAM_KICKED') return <UserX className="w-4 h-4" />;
        if (type === 'JOKER_INVITE') return <UserPlus className="w-4 h-4 text-turf-500" />;
        if (type === 'CHALLENGE' || metaType === 'MATCH_APPROVED') return <ShieldCheck className="w-4 h-4" />;
        if (type === 'REMATCH_PROPOSAL') return <Swords className="w-4 h-4" />;
        if (type === 'MATCH_REMINDER') return <Clock className="w-4 h-4" />;
        if (metaType === 'MATCH_REJECTED_PASSIVE' || metaType === 'MATCH_CANCELLED_BY_CAPTAIN') return <XCircle className="w-4 h-4" />;
        if (metaType === 'MATCH_REVOKED_TO_PENDING') return <ShieldAlert className="w-4 h-4" />;
        if (metaType === 'PROPOSAL_ACTION' || metaType === 'MATCH_RESTORED_TO_PENDING') return <Handshake className="w-4 h-4" />;
        if (metaType === 'BUSINESS_NOTE') return <MessageCircle className="w-4 h-4" />;
        return <Bell className="w-4 h-4" />;
    };

    const renderTitle = (type: string, notifObj: any) => {
        if (type === 'JOIN_REQUEST') return 'Yeni Katılma İsteği';
        if (type === 'JOIN_REQUEST_ACCEPTED') return 'Katılma İsteği Onaylandı';
        if (type === 'TEAM_KICKED') return 'Takımdan Çıkarıldınız';
        if (type === 'JOKER_INVITE') return 'Yeni Joker Daveti';
        if (type === 'CHALLENGE') return 'Yeni Meydan Okuma';
        if (type === 'MATCH_RESULT') return 'Maç Sonucu';
        if (type === 'REMATCH_PROPOSAL') return 'Yeni Maç Teklifi';
        if (type === 'SYSTEM') return notifObj.title ? notifObj.title.replace(/^[⚽⏳📩✅❌⚠️🌟💬🚫🕒]\s*/, '') : 'Sistem Mesajı';
        if (type === 'MATCH_REMINDER') return notifObj.title ? notifObj.title.replace(/^[⚽⏳📩✅❌⚠️🌟💬🚫🕒]\s*/, '') : 'Maç Hatırlatıcısı';
        if (type === 'RESERVATION_REQUEST') return notifObj.title ? notifObj.title.replace(/^[⚽⏳📩✅❌⚠️🌟💬🚫🕒]\s*/, '') : 'Rezervasyon İsteği';
        return 'Bildirim';
    };

    return (
        <div className={`relative bg-slate-800 rounded-2xl border overflow-hidden transition-all ${!notif.read ? 'border-turf-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-slate-700 opacity-90'}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getBorderClass(notif.type, notif.metadata?.type)}`}></div>

            <div className="p-4 pl-6">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg flex-shrink-0 ${getIconContainerClass(notif.type, notif.metadata?.type)}`}>
                            {renderIcon(notif.type, notif.metadata?.type)}
                        </div>
                        <h3 className="font-bold text-white text-base">{renderTitle(notif.type, notif)}</h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">{new Date(notif.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>

                <p className="text-sm text-slate-300 mb-3 leading-relaxed whitespace-pre-wrap">
                    {notif.message || 'Bildirim detayları'}
                </p>

                {/* Challenge Actions */}
                {notif.type === 'CHALLENGE' && (notif.metadata?.challengeId || notif.relatedId) && !notif.metadata?.isChatRedirect && (
                    (() => {
                        const date = notif.metadata?.matchDate;
                        const time = notif.metadata?.matchTime;
                        let isExpired = false;
                        if (date && time) {
                            const dateStr = typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
                            const matchDate = new Date(`${dateStr}T${time}`);
                            if (!isNaN(matchDate.getTime())) {
                                isExpired = new Date() > matchDate;
                            }
                        }
                        if (isExpired) {
                            return (
                                <div className="mt-2 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                                    <p className="text-xs text-slate-500 italic">Bu maç teklifinin süresi doldu. (Maç saati geçti)</p>
                                </div>
                            );
                        }
                        return (
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => handleRejectChallenge(notif.metadata?.challengeId || notif.relatedId)} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-900/50 hover:text-red-400 transition-colors"><X className="w-3 h-3" /> Reddet</button>
                                <button onClick={() => handleAcceptChallenge(notif.metadata?.challengeId || notif.relatedId)} className="flex-1 py-2 bg-turf-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20"><Check className="w-3 h-3" /> Kabul Et</button>
                            </div>
                        );
                    })()
                )}

                {/* Rematch Proposal Actions */}
                {notif.type === 'REMATCH_PROPOSAL' && notif.metadata?.matchAnnouncementId && (
                    <div className="flex gap-2 mt-3">
                        <button onClick={() => handleAcceptRematchFromNotif(notif)} className="flex-1 py-2 bg-turf-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20"><Check className="w-3 h-3" /> Kabul Et</button>
                        <button onClick={() => navigate('/chat', { state: { channelId: notif.metadata?.channelId } })} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"><MessageSquare className="w-3 h-3" /> Sohbete Git</button>
                    </div>
                )}

                {/* Chat Redirect */}
                {notif.metadata?.isChatRedirect && (
                    (() => {
                        const date = notif.metadata?.matchDate;
                        const time = notif.metadata?.matchTime;
                        let isExpired = false;
                        if (date && time) {
                            const dateStr = typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
                            const matchDate = new Date(`${dateStr}T${time}`);
                            const matchEndDate = new Date(matchDate.getTime() + 65 * 60 * 1000);
                            if (!isNaN(matchDate.getTime())) {
                                isExpired = new Date() > matchEndDate;
                            }
                        }
                        return (
                            <div className="mt-3">
                                <button onClick={() => !isExpired && navigate('/chat', { state: { channelId: notif.metadata.channelId } })} disabled={isExpired} className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-lg ${isExpired ? 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20'}`}>
                                    <MessageSquare className="w-3 h-3" /> {isExpired ? 'Maç Sona Erdi' : 'Sohbete Git'}
                                </button>
                            </div>
                        );
                    })()
                )}
            </div>
        </div>
    );
};
