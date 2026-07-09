import React, { useRef, useState } from 'react';
import { Camera, X, Store, Clock, Image as ImageIcon } from 'lucide-react';
import { ImageCropModal } from '../../../../../components/Modals/ImageCropModal';
import { Input } from '../RegisterInput';
import { RegisterSection, TimeButton } from '../RegisterSection';

interface BusinessDetailsStepProps {
    formData: any;
    updateBusiness: (field: string, value: any) => void;
    setIsTimePickerOpen: (opts: any) => void;
    fieldErrors?: Record<string, string>;
}

// Not: kök öğeye animasyon sınıfı KOYMA — AuthWizardLayout içeriği `animate-step-in` ile sarar.
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
        <div className="space-y-6">
            {/* İşletme adı */}
            <RegisterSection icon={Store} title="İşletme Adı" desc="Müşterilere bu adla görünürsün">
                <Input
                    label="İşletme Adı"
                    icon={<Store className="w-5 h-5" />}
                    value={formData.business.name}
                    onChange={(e: any) => updateBusiness('name', e.target.value)}
                    required
                    error={fieldErrors['business.name']}
                />
            </RegisterSection>

            {/* Çalışma saatleri */}
            <RegisterSection icon={Clock} title="Çalışma Saatleri" desc="İşletmenin genel açılış ve kapanışı">
                <div className="grid grid-cols-2 gap-3">
                    <TimeButton
                        label="Açılış"
                        value={formData.business.openTime}
                        onClick={() => setIsTimePickerOpen({ open: true, type: 'OPEN' })}
                    />
                    <TimeButton
                        label="Kapanış"
                        value={formData.business.closeTime}
                        onClick={() => setIsTimePickerOpen({ open: true, type: 'CLOSE' })}
                    />
                </div>
            </RegisterSection>

            {/* Kapak fotoğrafı */}
            <RegisterSection icon={ImageIcon} title="Kapak Fotoğrafı" desc="Müşteri kartında gösterilir">
                {formData.business.coverImageUrl ? (
                    <div className="space-y-3">
                        <div className="relative rounded-2xl overflow-hidden border border-slate-600">
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
                                className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 active:scale-90 transition-transform"
                            >
                                <X size={14} className="text-white" />
                            </button>
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:border-orange-500/60 hover:text-orange-400 font-bold text-sm transition-colors min-h-[44px]"
                        >
                            <Camera size={16} /> Değiştir
                        </button>
                    </div>
                ) : (
                    <div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center gap-2 w-full rounded-2xl border-2 border-dashed transition-colors font-bold text-sm ${
                                photoError
                                    ? 'border-red-500/60 text-red-400 hover:bg-red-500/10'
                                    : 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10'
                            }`}
                            style={{ height: 'clamp(120px, 20vh, 160px)' }}
                        >
                            <Camera size={26} /> Fotoğraf Ekle
                        </button>
                        {photoError && (
                            <p className="text-red-400 text-xs font-bold pl-1 mt-1.5 animate-fade-in">{photoError}</p>
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
                <p className="text-xs text-slate-500 leading-relaxed">
                    Bu fotoğraf müşterilere işletme kartınızda gösterilir. Dilerseniz saha fotoğrafınızla aynı görseli kullanabilirsiniz. Konum (şehir, ilçe, adres) bir sonraki adımda seçilir.
                </p>
            </RegisterSection>

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
