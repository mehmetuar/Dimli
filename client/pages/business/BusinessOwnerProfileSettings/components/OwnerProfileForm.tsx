import React, { useState } from 'react';
import { User, Mail, Phone, Lock, Pencil, Check } from 'lucide-react';
import { formatTurkishPhoneDisplay } from '../../../../utils/phone';

interface OwnerProfileFormProps {
    formData: { fullName: string; email: string };
    phone: string;
    fieldErrors: { fullName?: string; email?: string };
    onChange: (field: 'fullName' | 'email', value: string) => void;
}

export const OwnerProfileForm: React.FC<OwnerProfileFormProps> = ({
    formData,
    phone,
    fieldErrors,
    onChange,
}) => {
    // İşletme Bilgileri deseni: alanlar varsayılan KİLİTLİ, "Düzenle" ile açılır.
    const [isEditing, setIsEditing] = useState(false);

    // Sunucu telefonu 905XXXXXXXXX olarak saklar → görüntü için 0(5XX)... biçimine çevir.
    const phoneDisplay = formatTurkishPhoneDisplay(
        phone.startsWith('90') ? '0' + phone.slice(2) : phone,
    );

    const rowClass = (editable: boolean) =>
        `flex items-center gap-3 rounded-xl p-3 transition-all ${
            editable
                ? 'bg-slate-700/40 border border-slate-500/60 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 shadow-inner'
                : 'bg-slate-800/40 border border-slate-700/40'
        }`;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
                <label className="text-[clamp(11px,3vw,13px)] font-black uppercase tracking-widest text-slate-400">
                    Yetkili Bilgileri
                </label>
                <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm ${
                        isEditing
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20'
                    }`}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    {isEditing ? (
                        <><Check className="w-3 h-3" /> Bitti</>
                    ) : (
                        <><Pencil className="w-3 h-3" /> Düzenle</>
                    )}
                </button>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg p-4 space-y-4">

                {/* Ad Soyad */}
                <div className={!isEditing ? 'opacity-80' : ''}>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1">
                        Ad Soyad <span className="text-orange-500">*</span>
                    </label>
                    <div className={rowClass(isEditing)}>
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20">
                            <User className="w-4 h-4 text-orange-400" />
                        </div>
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => onChange('fullName', e.target.value)}
                            placeholder="Ad ve soyadınızı girin"
                            autoComplete="name"
                            disabled={!isEditing}
                            className="flex-1 bg-transparent border-none text-white font-bold text-[clamp(13px,3.5vw,15px)] focus:outline-none focus:ring-0 placeholder:text-slate-500 p-0 disabled:opacity-100"
                        />
                    </div>
                    {fieldErrors.fullName && (
                        <p className="text-red-400 text-[clamp(10px,2.8vw,12px)] font-medium mt-1.5 pl-1">{fieldErrors.fullName}</p>
                    )}
                </div>

                {/* E-Posta */}
                <div className={!isEditing ? 'opacity-80' : ''}>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1">
                        E-Posta <span className="text-orange-500">*</span>
                    </label>
                    <div className={rowClass(isEditing)}>
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20">
                            <Mail className="w-4 h-4 text-orange-400" />
                        </div>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => onChange('email', e.target.value)}
                            placeholder="ornek@eposta.com"
                            autoComplete="email"
                            autoCapitalize="none"
                            disabled={!isEditing}
                            className="flex-1 bg-transparent border-none text-white font-bold text-[clamp(13px,3.5vw,15px)] focus:outline-none focus:ring-0 placeholder:text-slate-500 p-0 lowercase disabled:opacity-100"
                        />
                    </div>
                    {fieldErrors.email && (
                        <p className="text-red-400 text-[clamp(10px,2.8vw,12px)] font-medium mt-1.5 pl-1">{fieldErrors.email}</p>
                    )}
                    <p className="text-slate-500 text-[clamp(9px,2.5vw,11px)] mt-1.5 pl-1">
                        E-posta aynı zamanda panele giriş bilgindir.
                    </p>
                </div>

                {/* Telefon — salt-okunur */}
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1">
                        Telefon
                    </label>
                    <div className="flex items-center gap-3 rounded-xl p-3 bg-slate-800/40 border border-slate-700/40">
                        <div className="w-8 h-8 rounded-lg bg-slate-600/30 flex items-center justify-center shrink-0 border border-slate-500/30">
                            <Phone className="w-4 h-4 text-slate-300" />
                        </div>
                        <span className="flex-1 text-slate-200 font-bold text-[clamp(13px,3.5vw,15px)] font-mono truncate">
                            {phoneDisplay || <span className="text-slate-600 font-sans">—</span>}
                        </span>
                        <div className="flex items-center gap-1 text-slate-500 shrink-0">
                            <Lock className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Değiştirilemez</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
