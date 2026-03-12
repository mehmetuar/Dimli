import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PitchSettingsHeaderProps {
    name: string;
    navigate: (path: string) => void;
}

export const PitchSettingsHeader: React.FC<PitchSettingsHeaderProps> = ({ name, navigate }) => {
    return (
        <div className="bg-slate-800 p-4 sticky top-0 z-10 border-b border-slate-700 shadow-lg flex items-center gap-3">
            <button onClick={() => navigate('/business/settings/pitches')} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
                <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
                <h1 className="font-sport font-bold text-xl text-white">{name}</h1>
                <p className="text-xs text-slate-400">Saha ayarlarını düzenle</p>
            </div>
        </div>
    );
};
