import React from 'react';
import { createPortal } from 'react-dom';
import { Crown, Shield, ShieldX, Trash2, Check, CheckCircle, AlertTriangle } from 'lucide-react';
import { useModalBodyClass } from '../../utils/useModalBodyClass';
import { LottiePlayer } from '../UI/LottiePlayer';

// VICE_LIMIT: başarı değil UYARI varyantı (amber) — modal olumsuz sonuçları da
// taşıyor (KICK/REJECTED/CANCELLED), tek TAMAM'lı sonuç modalının parçası.
export type SuccessType = 'TEAM_CREATED' | 'CAPTAIN' | 'VICE' | 'VICE_LIMIT' | 'ROLE_REMOVED' | 'KICK' | 'CHALLENGE_SENT' | 'CHALLENGE_ACCEPTED' | 'CHALLENGE_REJECTED' | 'MESSAGE_SENT' | 'MATCH_CANCELLED' | 'MATCH_APPROVED' | 'CREATE_AD' | 'DEFAULT';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: string;
    type?: SuccessType;
    onConfirm?: () => void;
    confirmText?: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
    isOpen,
    onClose,
    message,
    type = 'DEFAULT',
    onConfirm,
    confirmText = 'TAMAM'
}) => {
    useModalBodyClass(isOpen);
    if (!isOpen) return null;

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        } else {
            onClose();
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'CAPTAIN': return <Crown className="w-10 h-10 text-yellow-500" />;
            case 'VICE': return <Shield className="w-10 h-10 text-blue-500" />;
            case 'VICE_LIMIT': return <AlertTriangle className="w-10 h-10 text-amber-500" />;
            case 'ROLE_REMOVED': return <ShieldX className="w-10 h-10 text-orange-500" />;
            case 'KICK': return <Trash2 className="w-10 h-10 text-red-500" />;
            case 'CHALLENGE_SENT': return <Shield className="w-10 h-10 text-turf-500" />;
            case 'CHALLENGE_ACCEPTED': return <CheckCircle className="w-10 h-10 text-green-500" />;
            case 'CHALLENGE_REJECTED': return <ShieldX className="w-10 h-10 text-red-500" />;
            case 'MESSAGE_SENT': return <Check className="w-10 h-10 text-green-500" />;
            case 'MATCH_CANCELLED': return <ShieldX className="w-10 h-10 text-red-500" />;
            case 'MATCH_APPROVED': return <CheckCircle className="w-10 h-10 text-green-500" />;
            default: return <Shield className="w-10 h-10 text-turf-500" />;
        }
    };

    const getBgColor = () => {
        switch (type) {
            case 'CAPTAIN': return 'bg-yellow-500/20';
            case 'VICE': return 'bg-blue-500/20';
            case 'VICE_LIMIT': return 'bg-amber-500/20';
            case 'ROLE_REMOVED': return 'bg-orange-500/20';
            case 'KICK': return 'bg-red-500/20';
            case 'CHALLENGE_REJECTED': return 'bg-red-500/20';
            case 'CHALLENGE_ACCEPTED': return 'bg-green-500/20';
            case 'MESSAGE_SENT': return 'bg-green-500/20';
            case 'MATCH_CANCELLED': return 'bg-red-500/20';
            case 'MATCH_APPROVED': return 'bg-green-500/20';
            default: return 'bg-turf-500/20';
        }
    };

    const getButtonClass = () => {
        switch (type) {
            case 'CAPTAIN': return 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-600/20';
            case 'VICE': return 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20';
            case 'VICE_LIMIT': return 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20';
            case 'ROLE_REMOVED': return 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/20';
            case 'KICK': return 'bg-red-600 hover:bg-red-500 shadow-red-600/20';
            case 'CHALLENGE_REJECTED': return 'bg-red-600 hover:bg-red-500 shadow-red-600/20';
            case 'CHALLENGE_ACCEPTED': return 'bg-green-600 hover:bg-green-500 shadow-green-600/20';
            case 'MESSAGE_SENT': return 'bg-green-600 hover:bg-green-500 shadow-green-600/20';
            case 'MATCH_CANCELLED': return 'bg-red-600 hover:bg-red-500 shadow-red-600/20';
            case 'MATCH_APPROVED': return 'bg-green-600 hover:bg-green-500 shadow-green-600/20';
            default: return 'bg-turf-600 hover:bg-turf-500 shadow-turf-600/20';
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'CAPTAIN': return 'YENİ KAPTAN!';
            case 'VICE': return 'YENİ YARDIMCI!';
            case 'VICE_LIMIT': return 'YARDIMCI SINIRI';
            case 'ROLE_REMOVED': return 'YETKİ ALINDI';
            case 'KICK': return 'OYUNCU ATILDI';
            case 'TEAM_CREATED': return 'TEBRİKLER KAPTAN!';
            case 'CHALLENGE_SENT': return 'MEYDAN OKUMA!';
            case 'CHALLENGE_ACCEPTED': return 'KABUL EDİLDİ!';
            case 'CHALLENGE_REJECTED': return 'REDDEDİLDİ';
            case 'MESSAGE_SENT': return 'İLETİLDİ!';
            case 'MATCH_CANCELLED': return 'İPTAL EDİLDİ';
            case 'MATCH_APPROVED': return 'MAÇ ONAYLANDI!';
            default: return 'BAŞARILI!';
        }
    };

    // Portal → body: sarmalayan sayfaların scroll/stacking bağlamına hapsolmasın (TeamProfile fix)
    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
            <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 max-w-sm w-full text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-turf-500 to-blue-500"></div>

                {/* Olumlu sonuçlarda top→checkmark Lottie (tek-sefer); yıkıcı/nötr tipler lucide ikonla kalır.
                    reduce-motion / yüklenme sırasında fallback = klasik ikon kabı (dikişsiz). */}
                {(type === 'MATCH_APPROVED' || type === 'CHALLENGE_ACCEPTED' || type === 'MESSAGE_SENT') ? (
                    <div className="w-20 h-20 mx-auto mb-6">
                        <LottiePlayer
                            src="/animations/ball-success.json"
                            loop={false}
                            autoplay
                            ariaLabel="Başarılı"
                            style={{ width: '100%', height: '100%' }}
                            fallback={
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce-slow ${getBgColor()}`}>
                                    {getIcon()}
                                </div>
                            }
                        />
                    </div>
                ) : (
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow ${getBgColor()}`}>
                        {getIcon()}
                    </div>
                )}

                <h3 className="text-2xl font-sport font-black text-white italic uppercase mb-2">
                    {getTitle()}
                </h3>

                <p className="text-slate-400 mb-8">{message}</p>

                <button
                    onClick={handleConfirm}
                    className={`w-full text-white font-bold py-4 rounded-xl transition-colors shadow-lg ${getButtonClass()}`}
                >
                    {confirmText}
                </button>
            </div>
        </div>,
        document.body
    );
};
