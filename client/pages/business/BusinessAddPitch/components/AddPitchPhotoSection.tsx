import React, { useRef } from 'react';
import { Image, Camera } from 'lucide-react';

interface AddPitchPhotoSectionProps {
    imageUrl: string;
    uploadingPhoto: boolean;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
}

export const AddPitchPhotoSection: React.FC<AddPitchPhotoSectionProps> = ({ imageUrl, uploadingPhoto, onFileChange, error }) => {
    const photoInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="bg-slate-800/70 rounded-2xl border border-slate-700/60 overflow-hidden"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
            <div className="px-4 py-3.5 border-b border-slate-700/50"
                style={{ background: 'linear-gradient(90deg, rgba(249,115,22,0.06) 0%, transparent 100%)' }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-orange-500/15 rounded-lg border border-orange-500/20">
                            <Image className="w-4 h-4 text-orange-400" />
                        </div>
                        <h2 className="text-[clamp(13px,3.8vw,15px)] font-black text-white">Saha Fotoğrafı</h2>
                    </div>
                    <span className="text-red-500 text-sm font-bold">*</span>
                </div>
            </div>

            {imageUrl ? (
                <img src={imageUrl} alt="Saha" className="w-full aspect-video object-cover" />
            ) : (
                <div className="w-full aspect-video bg-slate-900/60 flex flex-col items-center justify-center gap-2">
                    <Image className="w-10 h-10 text-slate-600" />
                    <span className="text-[clamp(10px,2.8vw,12px)] text-slate-600 font-medium">Fotoğraf yok</span>
                </div>
            )}

            <div className="px-4 py-3.5 bg-slate-900/30">
                <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 bg-slate-700/80 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-bold px-3 py-3 rounded-xl transition-colors"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    <Camera className="w-4 h-4" />
                    {uploadingPhoto ? 'Yükleniyor...' : imageUrl ? 'Fotoğrafı Değiştir' : 'Fotoğraf Ekle'}
                </button>
                {error && (
                    <p className="text-red-400 text-[clamp(10px,2.8vw,12px)] font-bold mt-2 text-center">{error}</p>
                )}
            </div>

            <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
            />
        </div>
    );
};
