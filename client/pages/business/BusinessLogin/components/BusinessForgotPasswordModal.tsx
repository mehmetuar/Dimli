import React, { useState } from 'react';
import { X, Mail, KeyRound, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import api from '../../../../services/api';
import { OtpInput } from '../../../../components/UI/OtpInput';

interface BusinessForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BusinessForgotPasswordModal: React.FC<BusinessForgotPasswordModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [maskedPhone, setMaskedPhone] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const resetState = () => {
        setStep(1);
        setEmail('');
        setCode('');
        setNewPassword('');
        setConfirmPassword('');
        setMaskedPhone('');
        setError('');
        setLoading(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/auth/business/forgot-password/send-otp', { email });
            setMaskedPhone(response.data.maskedPhone);
            setStep(2);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Kod gönderilirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/business/forgot-password/verify-otp', { email, code });
            setStep(3);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Kod doğrulanamadı.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            setError('Şifreler eşleşmiyor.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/business/forgot-password/reset', { email, newPassword });
            setStep(4);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Şifre sıfırlanırken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white">Şifremi Unuttum</h2>
                    <button 
                        onClick={handleClose}
                        className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-full hover:bg-slate-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm font-bold text-center">
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Mail size={32} />
                                </div>
                                <p className="text-slate-300 text-sm">
                                    Hesabınıza bağlı e-posta adresini girin. Kayıtlı telefon numaranıza şifre sıfırlama kodu göndereceğiz.
                                </p>
                            </div>

                            <div>
                                <label className="block text-slate-400 text-xs font-bold uppercase mb-2">
                                    E-Posta Adresi
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition-colors"
                                    placeholder="ornek@saha.com"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Gönderiliyor...' : 'Kod Gönder'}
                                {!loading && <ArrowRight size={18} />}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <KeyRound size={32} />
                                </div>
                                <p className="text-slate-300 text-sm">
                                    <span className="font-bold text-white">{maskedPhone}</span> numaralı telefonunuza gönderilen 6 haneli doğrulama kodunu girin.
                                </p>
                            </div>

                            <div>
                                <label className="block text-slate-400 text-xs font-bold uppercase mb-3 text-center">
                                    Doğrulama Kodu
                                </label>
                                <OtpInput value={code} onChange={setCode} accent="orange" autoFocus disabled={loading} />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || code.length !== 6}
                                className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Doğrulanıyor...' : 'Doğrula'}
                            </button>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Lock size={32} />
                                </div>
                                <p className="text-slate-300 text-sm">
                                    Lütfen hesabınız için yeni bir şifre belirleyin.
                                </p>
                            </div>

                            <div>
                                <label className="block text-slate-400 text-xs font-bold uppercase mb-2">
                                    Yeni Şifre
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition-colors"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-slate-400 text-xs font-bold uppercase mb-2">
                                    Yeni Şifre (Tekrar)
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition-colors"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !newPassword || !confirmPassword}
                                className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                            </button>
                        </form>
                    )}

                    {step === 4 && (
                        <div className="text-center py-6">
                            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Şifre Değiştirildi!</h3>
                            <p className="text-slate-400 mb-8">
                                Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.
                            </p>
                            <button
                                onClick={handleClose}
                                className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-700 transition-colors border border-slate-700"
                            >
                                Giriş Ekranına Dön
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
