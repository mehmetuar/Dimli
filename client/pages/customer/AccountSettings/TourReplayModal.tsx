import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Zap, Users, Megaphone, ChevronRight } from 'lucide-react';
import { startTour } from '../../../services/tourStore';
import { useModalBodyClass } from '../../../utils/useModalBodyClass';

// Hesap Ayarları → Uygulama Tanıtımı: turları istenildiği kadar tekrar izleme.
// Seçim yapılınca ilgili sayfaya gidilir ve tur oradan başlar.
interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const TourReplayModal: React.FC<Props> = ({ isOpen, onClose }) => {
    useModalBodyClass(isOpen);
    const navigate = useNavigate();
    if (!isOpen) return null;

    const options = [
        {
            icon: <MapPin className="w-5 h-5" />,
            color: 'bg-turf-500/20 text-turf-400',
            label: 'Sahalar ve Maç Kurma Turu',
            desc: 'Örnek işletme üzerinden saha bulma, slot seçme ve ilan açma',
            run: () => {
                onClose();
                startTour('pitches');
                navigate('/pitches');
            },
        },
        {
            icon: <Megaphone className="w-5 h-5" />,
            color: 'bg-orange-500/20 text-orange-400',
            label: 'Maç Pazarı Turu',
            desc: 'İlanlar, filtreler, işletme ve takım kartları',
            run: () => {
                onClose();
                startTour('marketplace');
                navigate('/');
            },
        },
        {
            icon: <Users className="w-5 h-5" />,
            color: 'bg-blue-500/20 text-blue-400',
            label: 'Takım Turu',
            desc: 'Profilim/Takımım sekmeleri ve takım kurma',
            run: () => {
                onClose();
                startTour('team');
                navigate('/team');
            },
        },
        {
            icon: <Zap className="w-5 h-5" />,
            color: 'bg-yellow-500/20 text-yellow-400',
            label: 'Joker Havuzu Turu',
            desc: 'Eksik oyuncu tamamlama ve joker profili',
            run: () => {
                onClose();
                startTour('jokers');
                navigate('/jokers');
            },
        },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div
                className="bg-slate-800 w-full max-w-md sm:rounded-3xl rounded-t-3xl border border-slate-700 shadow-2xl overflow-hidden"
                style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
                    <div>
                        <h2 className="font-sport font-black text-xl text-white italic uppercase tracking-wide">
                            Uygulama <span className="text-turf-500">Tanıtımı</span>
                        </h2>
                        <p className="text-slate-400 text-xs mt-0.5">İzlemek istediğin turu seç.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    {options.map((opt) => (
                        <button
                            key={opt.label}
                            onClick={opt.run}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 text-white transition-all active:scale-[0.98] hover:bg-slate-900"
                        >
                            <div className={`p-2.5 rounded-xl ${opt.color}`}>{opt.icon}</div>
                            <div className="text-left flex-1 min-w-0">
                                <div className="font-bold text-sm">{opt.label}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{opt.desc}</div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
                        </button>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
};
