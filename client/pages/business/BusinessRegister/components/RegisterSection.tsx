import React from 'react';
import { Clock } from 'lucide-react';

interface SectionProps {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    desc?: string;
    children: React.ReactNode;
    /** true → içerik karta alınmaz (harita/özet gibi kendi kabı olan bloklar için) */
    bare?: boolean;
    className?: string;
}

/**
 * Premium bölüm başlığı — turuncu ikon-rozet (InfoSettingsHeader dili) + kartlanmış içerik.
 * İşletme paneli sayfalarıyla (İşletme Bilgileri / Saha Ayarları) aynı görsel dili taşır.
 */
export const RegisterSection: React.FC<SectionProps> = ({ icon: Icon, title, desc, children, bare, className }) => (
    <section className="space-y-3">
        <div className="flex items-center gap-2.5 px-0.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.15)] relative">
                <div className="absolute inset-0 rounded-xl bg-orange-400/10 blur-md" />
                <Icon className="relative z-10 w-5 h-5 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
            </div>
            <div className="min-w-0">
                <h3 className="font-black uppercase tracking-wide text-white leading-tight" style={{ fontSize: 'clamp(0.8rem, 2.2vh, 0.95rem)' }}>
                    {title}
                </h3>
                {desc && (
                    <p className="text-slate-400 leading-tight mt-0.5" style={{ fontSize: 'clamp(0.65rem, 1.7vh, 0.75rem)' }}>
                        {desc}
                    </p>
                )}
            </div>
        </div>
        {bare ? (
            children
        ) : (
            <div className={`bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-4 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.15)] ${className || ''}`}>
                {children}
            </div>
        )}
    </section>
);

interface TimeButtonProps {
    label: string;
    value: string;
    onClick: () => void;
    error?: string;
    required?: boolean;
}

/** Premium saat butonu — turuncu Clock ikonu + focus/hover; kayıt adımlarında saat seçimi. */
export const TimeButton: React.FC<TimeButtonProps> = ({ label, value, onClick, error, required }) => (
    <div className="flex flex-col gap-1.5 w-full min-w-0">
        <label className={`text-[11px] font-bold uppercase tracking-wider pl-1 ${error ? 'text-red-400' : 'text-slate-400'}`}>
            {label} {required && <span className="text-orange-500">*</span>}
        </label>
        <button
            type="button"
            onClick={onClick}
            className={`w-full flex items-center gap-2.5 bg-slate-800/40 border text-white px-4 rounded-2xl text-left transition-colors font-mono font-bold ${
                error ? 'border-red-500' : 'border-slate-700/80 hover:border-orange-500'
            }`}
            style={{ fontSize: 'clamp(0.9rem, 2.3vh, 1rem)', height: 'clamp(50px, 7vh, 58px)' }}
        >
            <Clock className="w-4 h-4 text-orange-400 shrink-0" />
            {value || 'Seç...'}
        </button>
        {error && <p className="text-red-400 text-xs font-bold pl-1 mt-0.5 animate-fade-in">{error}</p>}
    </div>
);
