import React from 'react';
import { Lock, Save } from 'lucide-react';
import { LoadingSpinner } from '../../../../components/UI/LoadingSpinner';

interface PasswordFormProps {
    passwordData: any;
    setPasswordData: (data: any) => void;
    handlePasswordChange: (e: React.FormEvent) => void;
    saving: boolean;
}

export const PasswordForm: React.FC<PasswordFormProps> = ({
    passwordData,
    setPasswordData,
    handlePasswordChange,
    saving
}) => {
    return (
        <form onSubmit={handlePasswordChange} className="space-y-4 animate-fade-in">
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mevcut Şifre</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="password"
                        value={passwordData.oldPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        placeholder="••••••••"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Yeni Şifre</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        placeholder="••••••••"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Yeni Şifre (Tekrar)</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        placeholder="••••••••"
                        required
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={saving}
                className="w-full bg-turf-600 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 mt-4 flex items-center justify-center gap-2"
            >
                {saving ? <LoadingSpinner size="sm" text="" /> : <><Save className="w-5 h-5" /> Şifreyi Güncelle</>}
            </button>
        </form>
    );
};
