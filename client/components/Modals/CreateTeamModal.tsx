import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Shield, Trophy, Palette, AlertCircle, Camera, Loader2 } from 'lucide-react';
import { Team, SkillLevel } from '../../types';
import { ColorPickerModal, TEAM_COLORS } from './ColorPickerModal';
import { ImageCropModal } from './ImageCropModal';
import api from '../../services/api';
import { useKeyboardHeight } from '../../utils/useKeyboardHeight';
import { useModalBodyClass } from '../../utils/useModalBodyClass';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (teamData: Partial<Team>) => void;
}

export const CreateTeamModal: React.FC<Props> = (props) => {
    useModalBodyClass(props.isOpen);
    if (!props.isOpen) return null;
    return <CreateTeamModalContent {...props} />;
};

const CreateTeamModalContent: React.FC<Props> = ({ isOpen, onClose, onCreate }) => {
    const keyboardHeight = useKeyboardHeight();

    const [name, setName] = useState('');
    const [level, setLevel] = useState<string>('BEGINNER');
    const [color, setColor] = useState('#ef4444');
    const [secondaryColor, setSecondaryColor] = useState('#3b82f6');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [colorModal, setColorModal] = useState<'primary' | 'secondary' | null>(null);

    // Photo states — mirrors TeamLogoManager pattern
    const [cropFile, setCropFile] = useState<File | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const LEVELS = [
        { value: 'BEGINNER', label: 'Başlangıç' },
        { value: 'INTERMEDIATE', label: 'Orta' },
        { value: 'ADVANCED', label: 'İleri' },
        { value: 'PRO', label: 'Profesyonel' },
    ];

    const colorLabel = (hex: string) =>
        TEAM_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase())?.label ?? hex.toUpperCase();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setCropFile(file);
        e.target.value = '';
    };

    const handleCropComplete = (croppedFile: File) => {
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        setCropFile(null);
        const url = URL.createObjectURL(croppedFile);
        setPendingFile(croppedFile);
        setPendingPreviewUrl(url);
    };

    const handleCancelPhoto = () => {
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        setPendingFile(null);
        setPendingPreviewUrl(null);
    };

    const handleSubmit = async () => {
        setError('');
        if (!name) return;

        setIsSubmitting(true);
        try {
            let logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=200`;

            // Upload photo separately as multipart/form-data — avoids PayloadTooLargeError
            if (pendingFile) {
                const formData = new FormData();
                formData.append('file', pendingFile);
                const res = await api.post('/files/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                logoUrl = res.data.url;
                if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
            }

            const newTeam: Partial<Team> = {
                name: name.trim(),
                level: level as SkillLevel,
                primaryColor: color,
                secondaryColor,
                description: description || 'Sahaların yeni yıldızı.',
                fairPlayScore: 5.0,
                logoUrl,
            };

            onCreate(newTeam);
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Fotoğraf yüklenirken hata oluştu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const initials = name.trim().slice(0, 2).toUpperCase();
    const levelLabel = LEVELS.find(l => l.value === level)?.label ?? '';

    // Portal → body: TeamProfile scroll konteynerine hapsolmasın (backdrop tüm ekranı kaplasın)
    return createPortal(
        <>
            {/* Tam-ekran sheet: sabit header + elastic içerik + sabit footer (safe-area/klavye uyumlu) */}
            <div
                className="fixed inset-0 z-[70] bg-pitch flex flex-col animate-fade-in"
                style={{ paddingTop: 'max(env(safe-area-inset-top), 20px)' }}
            >
                {/* Sabit header */}
                <div className="flex-shrink-0 px-5 pb-4 flex justify-between items-start">
                    <div>
                        <h2 className="font-sport font-black text-2xl text-white italic uppercase tracking-wide">
                            TAKIM <span className="text-turf-500">KUR</span>
                        </h2>
                        <p className="text-slate-400 text-xs mt-0.5">Efsane buradan başlıyor.</p>
                    </div>
                    <button onClick={onClose} className="flex-shrink-0 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Elastic içerik */}
                <div
                    className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide px-5 pb-6 space-y-6"
                    style={{ WebkitOverflowScrolling: 'touch', paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : undefined } as React.CSSProperties}
                >
                    {/* HERO: canlı takım önizlemesi (ad/renk/foto girildikçe güncellenir) */}
                    <div className="relative rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6 flex flex-col items-center overflow-hidden">
                        {/* seçilen renklerden hafif aura */}
                        <div
                            className="absolute inset-0 opacity-25 pointer-events-none"
                            style={{ background: `radial-gradient(circle at 28% 18%, ${color}, transparent 55%), radial-gradient(circle at 72% 26%, ${secondaryColor}, transparent 55%)` }}
                        />

                        {/* Avatar + iki-renk gradient halka (= foto yükleme butonu) */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="relative z-10 rounded-full p-[3px] active:scale-95 transition-transform"
                            style={{ background: `linear-gradient(135deg, ${color}, ${secondaryColor})` }}
                        >
                            <div className="w-28 h-28 rounded-full overflow-hidden bg-slate-900 border-2 border-slate-900 flex items-center justify-center">
                                {pendingPreviewUrl ? (
                                    <img src={pendingPreviewUrl} alt="Takım" className="w-full h-full object-cover" />
                                ) : initials ? (
                                    <span className="font-sport font-black text-white text-4xl italic">{initials}</span>
                                ) : (
                                    <Camera className="w-8 h-8 text-slate-500" />
                                )}
                            </div>
                            <div className="absolute bottom-0 right-0 bg-turf-600 border-2 border-slate-900 rounded-full p-1.5">
                                <Camera className="w-3.5 h-3.5 text-white" />
                            </div>
                        </button>

                        {/* Takım adı (canlı) */}
                        <h3 className="relative z-10 mt-4 font-sport font-black text-2xl text-white italic uppercase text-center leading-tight break-words max-w-full">
                            {name.trim() || 'Takım Adı'}
                        </h3>

                        {/* Seviye rozeti + iki renk noktası */}
                        <div className="relative z-10 mt-2 flex items-center gap-3">
                            <span className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-full px-3 py-1 text-xs font-bold text-turf-400">
                                <Trophy className="w-3.5 h-3.5" /> {levelLabel}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                                <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: secondaryColor }} />
                            </span>
                        </div>

                        {/* Foto seçiliyse kaldır */}
                        {pendingPreviewUrl && (
                            <button
                                type="button"
                                onClick={handleCancelPhoto}
                                className="relative z-10 mt-3 flex items-center gap-1.5 text-slate-400 text-xs font-semibold active:scale-95 transition"
                            >
                                <X className="w-3.5 h-3.5" /> Fotoğrafı kaldır
                            </button>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {/* Team Name */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Takım Adı
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); setError(''); }}
                            placeholder="Örn: Kadıköy Panterleri"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-turf-500 focus:outline-none font-bold"
                        />
                        {error && (
                            <div className="mt-2 text-red-400 text-xs font-bold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {error}
                            </div>
                        )}
                    </div>

                    {/* Colors */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                            <Palette className="w-4 h-4" /> Forma Renkleri
                        </label>
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => setColorModal('primary')}
                                className="w-full flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 active:scale-[0.98] transition-transform hover:border-slate-600"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full border border-white/20 flex-shrink-0" style={{ backgroundColor: color }} />
                                    <div className="text-left">
                                        <p className="text-slate-500 text-xs font-semibold uppercase">Ana Renk</p>
                                        <p className="text-white text-sm font-bold">{colorLabel(color)}</p>
                                    </div>
                                </div>
                                <Palette className="w-4 h-4 text-slate-500" />
                            </button>

                            <button
                                type="button"
                                onClick={() => setColorModal('secondary')}
                                className="w-full flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 active:scale-[0.98] transition-transform hover:border-slate-600"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full border border-white/20 flex-shrink-0" style={{ backgroundColor: secondaryColor }} />
                                    <div className="text-left">
                                        <p className="text-slate-500 text-xs font-semibold uppercase">İkincil Renk</p>
                                        <p className="text-white text-sm font-bold">{colorLabel(secondaryColor)}</p>
                                    </div>
                                </div>
                                <Palette className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>
                    </div>

                    {/* Level */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                            <Trophy className="w-4 h-4" /> Seviye
                        </label>
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-turf-500 focus:outline-none appearance-none"
                        >
                            {LEVELS.map(l => (
                                <option key={l.value} value={l.value}>{l.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Slogan / Bio</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Rakiplere gözdağı ver..."
                            rows={2}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-turf-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Sabit footer */}
                <div
                    className="flex-shrink-0 px-5 pt-3 bg-pitch border-t border-slate-800"
                    style={{ paddingBottom: `calc(max(env(safe-area-inset-bottom), 16px) + ${keyboardHeight > 0 ? keyboardHeight : 0}px)` }}
                >
                    <button
                        onClick={handleSubmit}
                        disabled={!name || isSubmitting}
                        className="w-full bg-turf-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black uppercase italic py-4 rounded-xl text-lg shadow-lg shadow-turf-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Oluşturuluyor...
                            </>
                        ) : (
                            'Takımı Oluştur'
                        )}
                    </button>
                </div>
            </div>

            {/* Image Crop Modal */}
            {cropFile && (
                <ImageCropModal
                    file={cropFile}
                    aspectRatio={1}
                    onCrop={handleCropComplete}
                    onCancel={() => setCropFile(null)}
                />
            )}

            {/* Color Picker Modals */}
            <ColorPickerModal
                isOpen={colorModal === 'primary'}
                onClose={() => setColorModal(null)}
                value={color}
                onChange={setColor}
                title="Ana Takım Rengi"
            />
            <ColorPickerModal
                isOpen={colorModal === 'secondary'}
                onClose={() => setColorModal(null)}
                value={secondaryColor}
                onChange={setSecondaryColor}
                title="İkincil Takım Rengi"
            />
        </>,
        document.body
    );
};
