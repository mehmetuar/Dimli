import React, { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { LoadingSpinner } from '../../../../../components/UI/LoadingSpinner';
import { ImageCropModal } from '../../../../../components/Modals/ImageCropModal';

interface PhotoUploadStepProps {
    fullName: string;
    avatarUrl: string;
    uploadLoading: boolean;
    onUpload: (file: File) => void;
}

export const PhotoUploadStep: React.FC<PhotoUploadStepProps> = ({
    fullName,
    avatarUrl,
    uploadLoading,
    onUpload,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [cropFile, setCropFile] = useState<File | null>(null);

    const initials = fullName
        ? fullName.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setCropFile(file);
        e.target.value = '';
    };

    const handleCropComplete = (croppedFile: File) => {
        setCropFile(null);
        onUpload(croppedFile);
    };

    // Başlık layout header'ında; "Kaydı Tamamla" aksiyonu layout footer'ında
    // (foto opsiyonel — fotolu/fotosuz aynı buton tamamlar, ayrı Atla gerekmez).
    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center gap-5 py-4">
                {/* Avatar önizleme */}
                <div
                    className="relative cursor-pointer group"
                    onClick={() => !uploadLoading && fileInputRef.current?.click()}
                >
                    <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-slate-700 group-hover:border-turf-500 bg-gradient-to-br from-turf-600 to-blue-600 flex items-center justify-center shadow-xl transition-all duration-200">
                        {uploadLoading ? (
                            <LoadingSpinner size="md" text="" />
                        ) : avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt="Profil fotoğrafı"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-white font-sport font-bold text-4xl">{initials}</span>
                        )}
                    </div>

                    {!uploadLoading && (
                        <div className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-turf-600 border-2 border-slate-800 flex items-center justify-center shadow-md">
                            <Camera className="w-4 h-4 text-white" />
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    disabled={uploadLoading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-3 bg-turf-600 hover:bg-turf-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors"
                >
                    <Camera className="w-4 h-4" />
                    {avatarUrl ? 'Fotoğrafı Değiştir' : 'Fotoğraf Seç'}
                </button>

                {avatarUrl && (
                    <p className="text-turf-400 text-sm font-bold">Fotoğraf hazır!</p>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />

            {cropFile && (
                <ImageCropModal
                    file={cropFile}
                    aspectRatio={1}
                    cropShape="round"
                    title="Profil Fotoğrafı"
                    onCrop={handleCropComplete}
                    onCancel={() => setCropFile(null)}
                />
            )}
        </div>
    );
};
