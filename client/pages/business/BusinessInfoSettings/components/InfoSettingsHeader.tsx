import React from 'react';
import { ArrowLeft, Building2 } from 'lucide-react';
import { pageTitle, pageSubtitle } from '../../shared/formStyles';

interface InfoSettingsHeaderProps {
    navigate: (path: string) => void;
}

export const InfoSettingsHeader: React.FC<InfoSettingsHeaderProps> = ({ navigate }) => {
    return (
        <div className="bg-slate-900/95 backdrop-blur-md z-20 border-b border-slate-800 px-4 py-4 flex items-center gap-3">
            <button
                onClick={() => navigate('/business/settings')}
                className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-orange-400" />
            </div>
            <div className="min-w-0">
                <h1 className="font-bold text-white leading-tight truncate" style={pageTitle}>İşletme Bilgileri</h1>
                <p className="text-slate-500 truncate" style={pageSubtitle}>Temel bilgilerinizi güncelleyin</p>
            </div>
        </div>
    );
};
