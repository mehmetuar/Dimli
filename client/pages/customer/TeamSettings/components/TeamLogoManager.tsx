import React, { useRef, useState } from 'react';
import { Upload, Trash2, Loader2, Camera } from 'lucide-react';

interface TeamLogoManagerProps {
    logoUrl: string | null;
    teamName: string;
    primaryColor: string;
    secondaryColor: string;
    isCaptain: boolean;
    isUploading: boolean;
    onUpload: (file: File) => Promise<string | null>;
    onRemove: () => void | Promise<void>;
}

export const TeamLogoManager: React.FC<TeamLogoManagerProps> = ({
    logoUrl,
    teamName,
    primaryColor,
    secondaryColor,
    isCaptain,
    isUploading,
    onUpload,
    onRemove,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imgError, setImgError] = useState(false);

    const initials = teamName ? teamName.slice(0, 2).toUpperCase() : '??';
    const showLogo = logoUrl && !imgError;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImgError(false);
        await onUpload(file);
        e.target.value = '';
    };

    return (
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/60 overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-700/50">
                <Camera className="w-4 h-4 text-turf-400" />
                <span className="text-slate-300 text-sm font-bold uppercase tracking-widest">Logo & Görsel</span>
            </div>

            <div className="p-5">
                <div className="flex flex-col items-center gap-4">
                    {/* Logo Preview */}
                    <div
                        className="relative w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center shadow-xl border-2 border-slate-600"
                        style={{
                            background: showLogo
                                ? undefined
                                : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor}88)`,
                        }}
                    >
                        {isUploading ? (
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        ) : showLogo ? (
                            <img
                                src={logoUrl!}
                                alt="Takım logosu"
                                className="w-full h-full object-cover"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <span className="text-white font-black text-2xl select-none">{initials}</span>
                        )}
                    </div>

                    {/* Actions */}
                    {isCaptain && (
                        <div className="flex items-center gap-2 w-full">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 text-sm font-semibold py-2.5 rounded-xl transition-all active:scale-95"
                            >
                                <Upload className="w-4 h-4" />
                                Logo Yükle
                            </button>

                            {logoUrl && (
                                <button
                                    onClick={onRemove}
                                    disabled={isUploading}
                                    className="flex items-center justify-center gap-1.5 bg-red-500/15 hover:bg-red-500/25 disabled:opacity-40 text-red-400 text-sm font-semibold px-3 py-2.5 rounded-xl transition-all active:scale-95"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}

                    {!isCaptain && (
                        <p className="text-slate-500 text-xs text-center">Logo değiştirmek için kaptan yetkisi gerekir</p>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            </div>
        </div>
    );
};
