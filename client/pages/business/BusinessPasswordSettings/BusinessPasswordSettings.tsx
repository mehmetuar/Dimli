import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Lock } from 'lucide-react';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import api from '../../../services/api';

export const BusinessPasswordSettings: React.FC = () => {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.newPassword !== formData.confirmPassword) {
            alert('Yeni şifreler eşleşmiyor!');
            return;
        }

        setSaving(true);
        setSuccess(false);
        setError('');

        try {
            await api.patch('/business-owner/change-password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
            });
            setSuccess(true);
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Şifre güncelleme başarısız oldu.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24">
            {/* Header */}
            <div className="bg-slate-800 p-4 sticky top-0 z-10 border-b border-slate-700 shadow-lg flex items-center gap-3">
                <button onClick={() => navigate('/business/settings')} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                    <h1 className="font-sport font-bold text-xl text-white">Şifre Değiştir</h1>
                    <p className="text-xs text-slate-400">Güvenlik ayarlarınızı güncelleyin</p>
                </div>
            </div>

            {success && (
                <div className="mx-4 mt-4 p-4 bg-green-600/20 border border-green-500 rounded-xl text-green-500 font-bold text-center">
                    ✓ Şifreniz başarıyla güncellendi!
                </div>
            )}

            {error && (
                <div className="mx-4 mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 font-bold text-center text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-4 space-y-6">
                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-300">
                            Mevcut Şifre
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input
                                type="password"
                                value={formData.currentPassword}
                                onChange={(e) => handleChange('currentPassword', e.target.value)}
                                className="w-full pl-10 p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                required
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-700 my-4"></div>

                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-300">
                            Yeni Şifre
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input
                                type="password"
                                value={formData.newPassword}
                                onChange={(e) => handleChange('newPassword', e.target.value)}
                                className="w-full pl-10 p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-300">
                            Yeni Şifre (Tekrar)
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                className="w-full pl-10 p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                required
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider transition-colors shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2"
                >
                    <Save className="w-5 h-5" />
                    {saving ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
                </button>
            </form>

            <BusinessNavbar />
        </div>
    );
};
