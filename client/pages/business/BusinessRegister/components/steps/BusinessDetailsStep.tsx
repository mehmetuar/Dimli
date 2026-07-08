import React, { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { ImageCropModal } from '../../../../../components/Modals/ImageCropModal';
import { Input } from '../RegisterSidebar';

interface BusinessDetailsStepProps {
    formData: any;
    updateBusiness: (field: string, value: any) => void;
    setIsTimePickerOpen: (opts: any) => void;
    fieldErrors?: Record<string, string>;
}

export const BusinessDetailsStep: React.FC<BusinessDetailsStepProps> = ({
    formData,
    updateBusiness,
    setIsTimePickerOpen,
    fieldErrors = {},
}) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [cropFile, setCropFile] = useState<File | null>(null);
    const photoError = fieldErrors['business.coverImageUrl'];

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4">İşletme Detayları</h2>

            <div className="grid grid-cols-1 gap-4">
                <Input
                    label="İşletme Adı"
                    value={formData.business.name}
                    onChange={(e: any) => updateBusiness('name', e.target.value)}
                    required
                    error={fieldErrors['business.name']}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400 font-bold uppercase ml-1">Açılış Saati</label>
                    <button
                        type="button"
                        onClick={() => setIsTimePickerOpen({ open: true, type: 'OPEN' })}
                        className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-mono font-bold text-sm min-h-[44px]"
                    >
                        {formData.business.openTime}
                    </button>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400 font-bold uppercase ml-1">Kapanış Saati</label>
                    <button
                        type="button"
                        onClick={() => setIsTimePickerOpen({ open: true, type: 'CLOSE' })}
                        className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-mono font-bold text-sm min-h-[44px]"
                    >
                        {formData.business.closeTime}
                    </button>
                </div>
            </div>

            {/* İşletme fotoğrafı — müşteri listesindeki işletme kartında görünür */}
            <div>
                <label className={`text-xs font-bold uppercase mb-2 block ${photoError ? 'text-red-400' : 'text-slate-400'}`}>
                    İşletme Fotoğrafı <span className="text-red-500">*</span>
                </label>
                {formData.business.coverImageUrl ? (
                    <div className="space-y-2">
                        <div className="relative rounded-xl overflow-hidden border border-slate-600">
                            <img
                                src={formData.business.coverImageUrl}
                                alt="İşletme"
                                className="w-full aspect-video object-cover"
                            />
                            <button
                                onClick={() => {
                                    updateBusiness('photoFile', null);
                                    updateBusiness('coverImageUrl', '');
                                }}
                                className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5"
                            >
                                <X size={14} className="text-white" />
                            </button>
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-400 hover:border-slate-500 font-bold text-sm transition-colors min-h-[44px]"
                        >
                            <Camera size={16} /> Değiştir
                        </button>
                    </div>
                ) : (
                    <div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center gap-2 w-full h-36 rounded-xl border-2 border-dashed transition-colors font-bold text-sm ${
                                photoError
                                    ? 'border-red-500/50 text-red-400 hover:bg-red-500/10'
                                    : 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10'
                            }`}
                        >
                            <Camera size={24} /> Fotoğraf Ekle
                        </button>
                        {photoError && (
                            <p className="text-red-400 text-xs font-bold ml-1 mt-1 animate-fade-in">{photoError}</p>
                        )}
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) setCropFile(file);
                        e.target.value = '';
                    }}
                />
                <p className="text-xs text-slate-500 mt-2">
                    Bu fotoğraf müşterilere işletme kartınızda gösterilir. İsterseniz saha fotoğrafınızla aynı görseli kullanabilirsiniz.
                </p>
            </div>

            <p className="text-xs text-slate-500 mt-1">
                Konum bilgisi (şehir, ilçe ve adres) bir sonraki adımda harita üzerinden seçilecektir.
            </p>

            {cropFile !== null && (
                <ImageCropModal
                    file={cropFile}
                    onCrop={(croppedFile: File) => {
                        updateBusiness('photoFile', croppedFile);
                        updateBusiness('coverImageUrl', URL.createObjectURL(croppedFile));
                        setCropFile(null);
                    }}
                    onCancel={() => setCropFile(null)}
                />
            )}
        </div>
    );
};
