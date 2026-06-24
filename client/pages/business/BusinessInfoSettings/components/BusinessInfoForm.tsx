import React from 'react';
import { MapPin } from 'lucide-react';

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
    onOpenLocationModal: (step: 'CITY' | 'DISTRICT') => void;
    onOpenMapModal: () => void;
}

export const BusinessInfoForm: React.FC<BusinessInfoFormProps> = ({
    formData,
    onChange,
    onOpenLocationModal,
    onOpenMapModal,
}) => {
    return (
        <div className="bg-slate-800 p-5 rounded-3xl border border-slate-700 shadow-lg space-y-4">
            {/* Name */}
            <div>
                <label className="block text-sm font-bold mb-2 text-slate-300 uppercase italic">İşletme Adı</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => onChange('name', e.target.value)}
                    className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-all font-medium"
                    required
                />
            </div>

            {/* City / District */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400 font-bold uppercase italic ml-1">Şehir *</label>
                    <button
                        type="button"
                        onClick={() => onOpenLocationModal('CITY')}
                        className="w-full bg-slate-900 border border-slate-700 text-white p-4 rounded-xl text-left hover:border-orange-500 transition-all font-medium"
                    >
                        {formData.city || 'Şehir Seç...'}
                    </button>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400 font-bold uppercase italic ml-1">İlçe *</label>
                    <button
                        type="button"
                        disabled={!formData.city}
                        onClick={() => onOpenLocationModal('DISTRICT')}
                        className={`w-full border p-4 rounded-xl text-left transition-all font-medium ${!formData.city ? 'bg-slate-950 border-slate-800 text-slate-700 cursor-not-allowed' : 'bg-slate-900 border-slate-700 text-white hover:border-orange-500'}`}
                    >
                        {formData.district || 'İlçe Seç...'}
                    </button>
                </div>
            </div>

            {/* Address */}
            <div>
                <label className="block text-sm font-bold mb-2 text-slate-300 uppercase italic">Adres</label>
                <textarea
                    value={formData.address}
                    onChange={(e) => onChange('address', e.target.value)}
                    rows={3}
                    className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-all font-medium resize-none"
                />
            </div>

            {/* Map Location Editor */}
            <div>
                <label className="block text-sm font-bold mb-2 text-slate-300 uppercase italic">Harita Konumu</label>
                <button
                    type="button"
                    onClick={onOpenMapModal}
                    className="w-full bg-slate-900 border border-slate-700 hover:border-orange-500 text-white p-4 rounded-xl flex items-center gap-3 transition-all group"
                >
                    <div className="w-10 h-10 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center group-hover:bg-orange-600/30 transition-colors">
                        <MapPin className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="text-left flex-1">
                        <div className="font-bold text-sm">
                            {formData.latitude ? 'Konumu Güncelle' : 'Haritadan Konum Seç'}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                            {formData.latitude
                                ? `${Number(formData.latitude).toFixed(5)}, ${Number(formData.longitude).toFixed(5)}`
                                : 'Henüz konum seçilmemiş'}
                        </div>
                    </div>
                    <span className="text-orange-400 text-xs font-bold">DÜZENLE →</span>
                </button>
            </div>
        </div>
    );
};
