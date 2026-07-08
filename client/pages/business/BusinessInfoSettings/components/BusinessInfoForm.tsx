import React, { useState } from 'react';
import { MapPin, Lock, Building2, FileText, Pencil, Check } from 'lucide-react';

interface BusinessInfoFormProps {
    formData: {
        name: string;
        address: string;
        city: string;
        district: string;
        latitude: number;
        longitude: number;
    };
    onChange: (field: string, value: string | number) => void;
    onOpenMapModal: () => void;
}

export const BusinessInfoForm: React.FC<BusinessInfoFormProps> = ({
    formData,
    onChange,
    onOpenMapModal,
}) => {
    const [isEditingGeneral, setIsEditingGeneral] = useState(false);

    return (
        <div className="space-y-6">
            {/* Genel Bilgiler Grubu */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                    <label className="text-[clamp(11px,3vw,13px)] font-black uppercase tracking-widest text-slate-400">
                        Genel Bilgiler
                    </label>
                    <button
                        type="button"
                        onClick={() => setIsEditingGeneral(!isEditingGeneral)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm ${
                            isEditingGeneral 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20'
                        }`}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        {isEditingGeneral ? (
                            <>
                                <Check className="w-3 h-3" /> Bitti
                            </>
                        ) : (
                            <>
                                <Pencil className="w-3 h-3" /> Düzenle
                            </>
                        )}
                    </button>
                </div>
                
                <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg p-4 space-y-4">
                    
                    {/* İşletme Adı */}
                    <div className={!isEditingGeneral ? 'opacity-80' : ''}>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1">
                            İşletme Adı <span className="text-orange-500">*</span>
                        </label>
                        <div className={`flex items-center gap-3 rounded-xl p-3 transition-all ${
                            isEditingGeneral 
                                ? 'bg-slate-700/40 border border-slate-500/60 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 shadow-inner' 
                                : 'bg-slate-900/40 border border-transparent'
                        }`}>
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20">
                                <Building2 className="w-4 h-4 text-orange-400" />
                            </div>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => onChange('name', e.target.value)}
                                placeholder="İşletme adınızı girin"
                                required
                                disabled={!isEditingGeneral}
                                className="flex-1 bg-transparent border-none text-white font-bold text-[clamp(13px,3.5vw,15px)] focus:outline-none focus:ring-0 placeholder:text-slate-500 p-0 disabled:opacity-100"
                            />
                        </div>
                    </div>

                    {/* Açık Adres */}
                    <div className={!isEditingGeneral ? 'opacity-80' : ''}>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1">
                            Açık Adres
                        </label>
                        <div className={`flex items-start gap-3 rounded-xl p-3 transition-all ${
                            isEditingGeneral 
                                ? 'bg-slate-700/40 border border-slate-500/60 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 shadow-inner' 
                                : 'bg-slate-900/40 border border-transparent'
                        }`}>
                            <div className="w-8 h-8 rounded-lg bg-slate-600/30 flex items-center justify-center shrink-0 mt-0.5 border border-slate-500/30">
                                <FileText className="w-4 h-4 text-slate-300" />
                            </div>
                            <textarea
                                value={formData.address}
                                onChange={(e) => onChange('address', e.target.value)}
                                rows={3}
                                placeholder="Sokak, cadde, bina no gibi detaylı adres bilgisini girin…"
                                disabled={!isEditingGeneral}
                                className="flex-1 bg-transparent border-none text-white font-medium text-[clamp(13px,3.5vw,15px)] focus:outline-none focus:ring-0 placeholder:text-slate-500 p-0 resize-none leading-relaxed disabled:opacity-100"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Konum Grubu */}
            <div className="space-y-3">
                <label className="block text-[clamp(11px,3vw,13px)] font-black uppercase tracking-widest text-slate-400 pl-2">
                    Konum Bilgisi
                </label>
                
                <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.15)] divide-y divide-white/5">
                    
                    {/* Harita Butonu */}
                    <button
                        type="button"
                        onClick={onOpenMapModal}
                        className="w-full relative p-4 flex items-center gap-4 hover:bg-white/5 transition-colors group text-left"
                    >
                        <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(249,115,22,0.1)] group-hover:bg-orange-500/30 transition-colors relative">
                            <div className="absolute inset-0 bg-orange-400/10 blur-md rounded-xl" />
                            <MapPin className="relative z-10 w-5 h-5 text-orange-400 drop-shadow-[0_0_3px_rgba(249,115,22,0.5)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-white font-bold text-base mb-0.5 truncate drop-shadow-sm">
                                {formData.latitude ? 'Konumu Güncelle' : 'Haritadan Konum Seç'}
                            </div>
                            <div className="text-slate-500 font-medium text-xs truncate font-mono">
                                {formData.latitude
                                    ? `${Number(formData.latitude).toFixed(5)}, ${Number(formData.longitude).toFixed(5)}`
                                    : 'Henüz haritadan işaretlenmedi'}
                            </div>
                        </div>
                        <span className="text-orange-400 font-bold text-[10px] shrink-0 tracking-widest uppercase">Düzenle &rarr;</span>
                    </button>

                    {/* Tespit Edilen Şehir/İlçe */}
                    <div className="relative p-4 flex items-center gap-4 bg-slate-950/20">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                            <Lock className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                                Tespit Edilen Şehir / İlçe
                            </div>
                            {formData.city ? (
                                <div className="text-green-400 font-bold text-sm truncate drop-shadow-[0_0_4px_rgba(74,222,128,0.3)]">
                                    {formData.city}{formData.district ? ` / ${formData.district}` : ''}
                                </div>
                            ) : (
                                <div className="text-slate-600 font-medium text-sm truncate italic">
                                    Haritadan konum seçilince otomatik dolar
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
