import React from 'react';
import { ArrowLeft, PlusCircle } from 'lucide-react';

interface AddPitchHeaderProps {
    navigate: (path: string) => void;
}

export const AddPitchHeader: React.FC<AddPitchHeaderProps> = ({ navigate }) => {
    return (
        <div
            className="sticky top-0 z-10 border-b border-slate-700/60 flex items-center gap-3 px-4 py-4"
            style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}
        >
            <button
                onClick={() => navigate('/business/settings/pitches')}
                className="p-2.5 bg-slate-700/60 border border-slate-600/50 rounded-xl hover:bg-slate-600/60 active:scale-95 transition-all flex-shrink-0"
                style={{ WebkitTapHighlightColor: 'transparent' }}
            >
                <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-orange-500/15 rounded-lg border border-orange-500/20 flex-shrink-0">
                    <PlusCircle className="w-4 h-4 text-orange-400" />
                </div>
                <div className="min-w-0">
                    <h1 className="font-sport font-black text-[clamp(14px,4.5vw,18px)] text-white tracking-tight truncate">Yeni Saha Ekle</h1>
                    <p className="text-[clamp(9px,2.5vw,11px)] text-slate-400">Sahanız onaya gönderilecektir</p>
                </div>
            </div>
        </div>
    );
};
