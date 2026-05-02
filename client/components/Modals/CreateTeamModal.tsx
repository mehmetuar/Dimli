import React, { useRef, useState } from 'react';
import { X, Shield, Trophy, Palette, AlertCircle, Camera, Loader2, Check } from 'lucide-react';
import { Team } from '../../types';
import { CURRENT_USER, MOCK_TEAMS } from '../../constants';
import { ColorPickerModal, TEAM_COLORS } from './ColorPickerModal';
import { ImageCropModal } from './ImageCropModal';
import api from '../../services/api';
import { useKeyboardHeight } from '../../utils/useKeyboardHeight';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (teamData: Partial<Team>) => void;
}

export const CreateTeamModal: React.FC<Props> = ({ isOpen, onClose, onCreate }) => {
    if (!isOpen) return null;

    const keyboardHeight = useKeyboardHeight();

    const [name, setName] = useState('');
    const [level, setLevel] = useState('BEGINNER');
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

        const nameExists = MOCK_TEAMS.some(t => t.name.toLowerCase() === name.trim().toLowerCase());
        if (nameExists) {
            setError('Bu takım ismi zaten alınmış. Lütfen başka bir isim seçin.');
            return;
        }

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
                level,
                primaryColor: color,
                secondaryColor,
                description: description || 'Sahaların yeni yıldızı.',
                captainId: CURRENT_USER.id,
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

    return (
        <>
            <div
                className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/90 backdrop-blur-sm animate-fade-in"
                style={keyboardHeight > 0 ? { bottom: keyboardHeight } : undefined}
            >
                <div className="bg-slate-800 w-full max-w-lg rounded-3xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">

                    {/* Header */}
                    <div className="p-6 border-b border-slate-700 bg-slate-900 flex justify-between items-center rounded-t-3xl">
                        <div>
                            <h2 className="font-sport font-black text-2xl text-white italic uppercase tracking-wide">
                                TAKIM <span className="text-turf-500">KUR</span>
                            </h2>
                            <p className="text-slate-400 text-xs">Efsane buradan başlıyor.</p>
                        </div>
                        <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto space-y-6">

                        {/* Photo Upload */}
                        <div className="flex flex-col items-center gap-3">
                            {/* Photo circle */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-slate-600 bg-slate-900 flex items-center justify-center active:scale-95 transition-transform"
                                style={pendingPreviewUrl ? { borderStyle: 'solid', borderColor: '#475569' } : undefined}
                            >
                                {pendingPreviewUrl ? (
                                    <>
                                        <img src={pendingPreviewUrl} alt="Takım fotoğrafı" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                            <Camera className="w-5 h-5 text-white" />
                                        </div>
                                    </>
                                ) : (
                                    <Camera className="w-7 h-7 text-slate-500" />
                                )}
                            </button>

                            {/* Pending photo confirm/cancel */}
                            {pendingPreviewUrl ? (
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCancelPhoto}
                                        className="flex items-center gap-1.5 bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg active:scale-95 transition-all"
                                    >
                                        <X className="w-3.5 h-3.5" /> Kaldır
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1.5 bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg active:scale-95 transition-all"
                                    >
                                        <Camera className="w-3.5 h-3.5" /> Değiştir
                                    </button>
                                    <span className="flex items-center gap-1 text-turf-400 text-xs font-semibold px-2">
                                        <Check className="w-3.5 h-3.5" /> Seçildi
                                    </span>
                                </div>
                            ) : (
                                <p className="text-slate-500 text-xs text-center">
                                    Takım fotoğrafı ekle{' '}
                                    <span className="text-slate-600">(isteğe bağlı)</span>
                                </p>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>

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

                            <div className="mt-3 flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                                <span className="text-slate-500 text-xs">+</span>
                                <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: secondaryColor }} />
                                <span className="text-xs text-slate-500 ml-1">Seçilen renkler</span>
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

                    {/* Footer */}
                    <div className="p-4 bg-slate-900 border-t border-slate-800 sticky bottom-0 rounded-b-3xl">
                        <button
                            onClick={handleSubmit}
                            disabled={!name || isSubmitting}
                            className="w-full bg-turf-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black uppercase italic py-4 rounded-xl text-lg shadow-lg shadow-turf-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
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
        </>
    );
};
