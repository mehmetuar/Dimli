import React from 'react';
import { ArrowLeft, Plus } from 'lucide-react';

interface PitchListHeaderProps {
    navigate: (path: string) => void;
    setShowAddModal: (open: boolean) => void;
}

export const PitchListHeader: React.FC<PitchListHeaderProps> = ({ navigate, setShowAddModal }) => {
    return (
        <div className="bg-slate-800 p-4 sticky top-0 z-10 border-b border-slate-700 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/business/settings')} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                    <h1 className="font-sport font-bold text-xl text-white">Saha Ayarları</h1>
                    <p className="text-xs text-slate-400">Düzenlemek istediğiniz sahayı seçin</p>
                </div>
            </div>
            <button
                onClick={() => setShowAddModal(true)}
                className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1 shadow-lg shadow-orange-600/20"
            >
                <Plus className="w-4 h-4" /> Ekle
            </button>
        </div>
    );
};
