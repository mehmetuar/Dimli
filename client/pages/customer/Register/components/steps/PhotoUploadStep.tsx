import React, { useRef } from 'react';
import { Camera, Check, ChevronRight } from 'lucide-react';
import { LoadingSpinner } from '../../../../../components/UI/LoadingSpinner';

interface PhotoUploadStepProps {
    fullName: string;
    avatarUrl: string;
    uploadLoading: boolean;
    registerLoading: boolean;
    onUpload: (file: File) => void;
}

export const PhotoUploadStep: React.FC<PhotoUploadStepProps> = ({
    fullName,
    avatarUrl,
    uploadLoading,
    registerLoading,
    onUpload,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const initials = fullName
        ? fullName.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-white font-sport font-black text-2xl italic mb-1">FOTOĞRAF EKLE</h2>
                <p className="text-slate-400 text-sm">İsteğe bağlı — daha sonra da ekleyebilirsin.</p>
            </div>

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
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUpload(file);
                    e.target.value = '';
                }}
            />

            {/* Aksiyon butonları */}
            <div className="flex gap-3 mt-6">
                {/* Atla — her zaman görünür */}
                <button
                    type="submit"
                    disabled={registerLoading || uploadLoading}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                    Atla <ChevronRight className="w-4 h-4" />
                </button>

                {/* Kaydı Tamamla — sadece fotoğraf yüklendiyse */}
                {avatarUrl && (
                    <button
                        type="submit"
                        disabled={registerLoading || uploadLoading}
                        className="flex-1 bg-turf-600 hover:bg-turf-500 disabled:opacity-50 text-white py-4 rounded-xl font-bold shadow-lg shadow-turf-600/20 transition-colors flex items-center justify-center gap-2"
                    >
                        {registerLoading ? <LoadingSpinner size="sm" text="" /> : <><Check className="w-4 h-4" /> Tamamla</>}
                    </button>
                )}
            </div>
        </div>
    );
};
