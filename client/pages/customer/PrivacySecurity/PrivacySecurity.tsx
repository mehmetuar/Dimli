import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock, Save, ExternalLink, FileText, Shield } from 'lucide-react';
import { useProfile } from '../ProfileSettings/hooks/useProfile';
import { DeleteAccountModal } from '../ProfileSettings/components/DeleteAccountModal';

const inputClass = 'w-full bg-slate-900/80 text-white px-4 py-3.5 rounded-xl border border-slate-700 focus:border-turf-500/70 focus:outline-none font-semibold text-sm placeholder-slate-600 transition-colors';
const labelClass = 'block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5';

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/60 flex items-center gap-2">
            <span className="text-turf-500">{icon}</span>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</span>
        </div>
        <div className="p-4 space-y-4">{children}</div>
    </div>
);

const scrollToInput = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
};

const openUrl = (url: string) => {
    window.open(url, '_system', 'location=yes');
};

export const PrivacySecurity: React.FC = () => {
    const navigate = useNavigate();
    const {
        saving,
        message,
        passwordData, setPasswordData,
        handlePasswordChange,
        isDeleteModalOpen, setIsDeleteModalOpen,
        deleteAccount,
    } = useProfile();

    return (
        <div className="fixed inset-0 bg-pitch flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

            {/* Header */}
            <header className="bg-pitch/95 backdrop-blur-sm border-b border-slate-800/60">
                <div className="flex items-center gap-3 px-4 py-4 max-w-lg mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="font-sport font-black text-2xl text-white italic tracking-wide uppercase">
                        Gizlilik ve Güvenlik
                    </h1>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                <div className="max-w-lg mx-auto px-4 pt-5 space-y-5 pb-10">

                    {/* Mesaj */}
                    {message && (
                        <div className={`p-3.5 rounded-xl text-sm font-bold text-center ${
                            message.type === 'success'
                                ? 'bg-green-500/10 border border-green-500/40 text-green-400'
                                : 'bg-red-500/10 border border-red-500/40 text-red-400'
                        }`}>
                            {message.text}
                        </div>
                    )}

                    {/* Gizlilik Belgeleri */}
                    <Section icon={<Shield className="w-4 h-4" />} title="Gizlilik Belgeleri">
                        <p className="text-slate-400 text-xs leading-relaxed">
                            Kişisel verilerinizin nasıl işlendiğini ve hizmetimizi kullanma koşullarını aşağıdaki belgelerden inceleyebilirsiniz.
                        </p>
                        <button
                            onClick={() => openUrl('https://dimli.com.tr/kvkk')}
                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-900/60 border border-slate-700 text-white hover:border-slate-600 transition-all active:scale-[0.98]"
                        >
                            <Shield className="w-4 h-4 text-turf-400 shrink-0" />
                            <div className="text-left flex-1 min-w-0">
                                <div className="font-bold text-sm">KVKK Politikası</div>
                                <div className="text-xs text-slate-500 mt-0.5">Kişisel verilerin korunması</div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
                        </button>
                        <button
                            onClick={() => openUrl('https://dimli.com.tr/kullanim-sartlari')}
                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-900/60 border border-slate-700 text-white hover:border-slate-600 transition-all active:scale-[0.98]"
                        >
                            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                            <div className="text-left flex-1 min-w-0">
                                <div className="font-bold text-sm">Kullanım Şartları</div>
                                <div className="text-xs text-slate-500 mt-0.5">Hizmet kullanım koşulları</div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
                        </button>
                    </Section>

                    {/* Şifre Değiştir */}
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <Section icon={<Lock className="w-4 h-4" />} title="Şifre Değiştir">
                            <div>
                                <label className={labelClass}>Mevcut Şifre</label>
                                <input
                                    type="password"
                                    value={passwordData.oldPassword}
                                    onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                    onFocus={scrollToInput}
                                    className={inputClass}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Yeni Şifre</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    onFocus={scrollToInput}
                                    className={inputClass}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Yeni Şifre (Tekrar)</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    onFocus={scrollToInput}
                                    className={inputClass}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </Section>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-turf-600 hover:bg-turf-500 disabled:opacity-60 text-white py-4 rounded-2xl font-black text-base uppercase tracking-widest transition-all shadow-lg shadow-turf-600/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            {saving
                                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <><Save className="w-4 h-4" /> Şifreyi Güncelle</>
                            }
                        </button>
                    </form>

                    {/* Hesap Silme — altta, göze batmayan */}
                    <div className="pt-4 pb-2 flex justify-center">
                        <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="text-slate-600 hover:text-red-400 text-xs font-semibold transition-colors py-2 px-4"
                        >
                            Hesabımı Sil
                        </button>
                    </div>
                </div>
            </div>

            <DeleteAccountModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={deleteAccount}
            />
        </div>
    );
};
