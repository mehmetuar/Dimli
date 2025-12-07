import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export const ProfileSettings: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-pitch pt-safe-top px-4">
            <header className="flex items-center gap-4 py-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-8 h-8" />
                </button>
                <h1 className="font-sport font-black text-3xl text-white italic tracking-wide uppercase">
                    PROFİL AYARLARI
                </h1>
            </header>

            <div className="text-slate-500 text-center mt-20">
                <p>Ayarlar yakında eklenecek...</p>
            </div>
        </div>
    );
};
