import React, { useRef, useState } from 'react';
import { Camera, Trash2, Check, X } from 'lucide-react';
import { LoadingSpinner } from '../../../../components/UI/LoadingSpinner';
import { ImageCropModal } from '../../../../components/Modals/ImageCropModal';

interface ProfilePhotoManagerProps {
    avatarUrl: string | null;
    fullName: string;
    isUploading: boolean;
    onUpload: (file: File) => void;
    onRemove: () => void;
}

export const ProfilePhotoManager: React.FC<ProfilePhotoManagerProps> = ({
    avatarUrl,
    fullName,
    isUploading,
    onUpload,
    onRemove,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [cropFile, setCropFile] = useState<File | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);

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
        const previewUrl = URL.createObjectURL(croppedFile);
        setPendingFile(croppedFile);
        setPendingPreviewUrl(previewUrl);
    };

    const handleCancelPreview = () => {
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        setPendingFile(null);
        setPendingPreviewUrl(null);
    };

    const handleConfirm = () => {
        if (!pendingFile) return;
        const file = pendingFile;
        const url = pendingPreviewUrl;
        setPendingFile(null);
        setPendingPreviewUrl(null);
        onUpload(file);
        if (url) URL.revokeObjectURL(url);
    };

    const displayUrl = pendingPreviewUrl ?? avatarUrl;

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Avatar preview */}
            <div className="relative">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-700 bg-gradient-to-br from-turf-600 to-blue-600 flex items-center justify-center shadow-xl">
                    {isUploading ? (
                        <LoadingSpinner size="md" text="" />
                    ) : displayUrl ? (
                        <img
                            src={displayUrl}
                            alt="Profil fotoğrafı"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-white font-sport font-bold text-3xl">{initials}</span>
                    )}
                </div>
            </div>

            {/* Önizleme: onay/iptal */}
            {pendingPreviewUrl ? (
                <div className="flex gap-2">
                    <button
                        type="button"
                        disabled={isUploading}
                        onClick={handleCancelPreview}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-xl font-bold text-sm transition-colors"
                    >
                        <X className="w-4 h-4" /> İptal
                    </button>
                    <button
                        type="button"
                        disabled={isUploading}
                        onClick={handleConfirm}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-turf-600 hover:bg-turf-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors"
                    >
                        <Check className="w-4 h-4" /> Kaydet
                    </button>
                </div>
            ) : (
                <div className="flex gap-3">
                    <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-turf-600 hover:bg-turf-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors"
                    >
                        <Camera className="w-4 h-4" />
                        {avatarUrl ? 'Değiştir' : 'Fotoğraf Yükle'}
                    </button>

                    {avatarUrl && (
                        <button
                            type="button"
                            disabled={isUploading}
                            onClick={onRemove}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-400 rounded-xl font-bold text-sm transition-colors border border-red-500/20"
                        >
                            <Trash2 className="w-4 h-4" />
                            Sil
                        </button>
                    )}
                </div>
            )}

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
