import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface InfoSettingsHeaderProps {
    navigate: (path: string) => void;
}

export const InfoSettingsHeader: React.FC<InfoSettingsHeaderProps> = ({ navigate }) => {
    return (
        <div className="bg-slate-900/95 backdrop-blur-md z-20 border-b border-slate-800 px-4 py-4 flex items-center gap-3">
            <button
                onClick={() => navigate('/business/settings')}
                className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h1 className="font-bold text-lg text-white leading-tight">İşletme Bilgileri</h1>
                <p className="text-slate-500 text-xs">Temel bilgilerinizi güncelleyin</p>
            </div>
        </div>
    );
};
