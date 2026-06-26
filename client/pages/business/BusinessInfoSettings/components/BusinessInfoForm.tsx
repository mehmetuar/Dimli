import React from 'react';
import { MapPin, Lock, Building2, FileText } from 'lucide-react';
import { fieldLabel, fieldInput, fieldTextarea, fieldIcon, helperText } from '../../shared/formStyles';

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

const labelClass = 'block font-bold uppercase italic tracking-wide text-slate-300 mb-2';

export const BusinessInfoForm: React.FC<BusinessInfoFormProps> = ({
    formData,
    onChange,
    onOpenMapModal,
}) => {
    return (
        <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-lg space-y-4" style={{ padding: 'clamp(16px, 3vw, 20px)' }}>
            {/* İşletme Adı */}
            <div>
                <label className={labelClass} style={fieldLabel}>
                    İşletme Adı <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" style={fieldIcon} />
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => onChange('name', e.target.value)}
                        placeholder="İşletme adınızı girin"
                        required
                        className="w-full pl-11 pr-4 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors placeholder:text-slate-600"
                        style={fieldInput}
                    />
                </div>
            </div>

            {/* Şehir / İlçe — salt-okunur; yalnızca aşağıdaki Harita Konumu ile güncellenir */}
            <div>
                <label className={labelClass} style={fieldLabel}>Şehir / İlçe</label>
                {formData.city ? (
                    <div className="flex items-center gap-2.5 bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3">
                        <Lock className="text-green-400 shrink-0" style={fieldIcon} />
                        <div className="flex-1 min-w-0">
                            <p className="text-slate-500 font-bold uppercase mb-0.5" style={{ fontSize: 'clamp(0.58rem, 1.4vh, 0.65rem)' }}>Tespit Edilen Konum</p>
                            <p className="font-bold text-green-400 truncate" style={helperText}>
                                {formData.city}{formData.district ? ` / ${formData.district}` : ''}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3">
                        <p className="text-slate-500 font-bold uppercase mb-0.5" style={{ fontSize: 'clamp(0.58rem, 1.4vh, 0.65rem)' }}>Konum</p>
                        <p className="text-slate-400" style={helperText}>Henüz konum seçilmemiş — aşağıdaki Harita Konumu ile belirleyin.</p>
                    </div>
                )}
            </div>

            {/* Adres */}
            <div>
                <label className={labelClass} style={fieldLabel}>Açık Adres</label>
                <div className="relative">
                    <FileText className="absolute left-3.5 top-3.5 text-slate-500 pointer-events-none" style={fieldIcon} />
                    <textarea
                        value={formData.address}
                        onChange={(e) => onChange('address', e.target.value)}
                        rows={3}
                        placeholder="Sokak, cadde, bina no gibi detaylı adres bilgisini girin…"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors placeholder:text-slate-600 resize-none"
                        style={fieldTextarea}
                    />
                </div>
            </div>

            {/* Harita Konumu */}
            <div>
                <label className={labelClass} style={fieldLabel}>Harita Konumu</label>
                <button
                    type="button"
                    onClick={onOpenMapModal}
                    className="w-full bg-slate-900 border border-slate-700 hover:border-orange-500 text-white p-4 rounded-xl flex items-center gap-3 transition-all group"
                >
                    <div className="w-10 h-10 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center group-hover:bg-orange-600/30 transition-colors shrink-0">
                        <MapPin className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                        <div className="font-bold truncate" style={helperText}>
                            {formData.latitude ? 'Konumu Güncelle' : 'Haritadan Konum Seç'}
                        </div>
                        <div className="text-slate-500 font-mono mt-0.5 truncate" style={{ fontSize: 'clamp(0.6rem, 1.5vh, 0.72rem)' }}>
                            {formData.latitude
                                ? `${Number(formData.latitude).toFixed(5)}, ${Number(formData.longitude).toFixed(5)}`
                                : 'Henüz konum seçilmemiş'}
                        </div>
                    </div>
                    <span className="text-orange-400 font-bold shrink-0" style={{ fontSize: 'clamp(0.6rem, 1.5vh, 0.72rem)' }}>DÜZENLE →</span>
                </button>
            </div>
        </div>
    );
};
