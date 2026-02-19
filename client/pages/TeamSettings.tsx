import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Shield, Save, Check, X, AlertTriangle,
    Image, MapPin, BarChart2, Palette, Type
} from 'lucide-react';
import api from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

const LEVELS = [
    { value: 'BEGINNER', label: 'Başlangıç', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/40' },
    { value: 'INTERMEDIATE', label: 'Orta', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/40' },
    { value: 'ADVANCED', label: 'İleri', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/40' },
    { value: 'PRO', label: 'Profesyonel', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/40' },
];

const PRIMARY_COLORS = [
    { value: 'bg-blue-500', label: 'Mavi', hex: '#3b82f6' },
    { value: 'bg-green-500', label: 'Yeşil', hex: '#22c55e' },
    { value: 'bg-red-500', label: 'Kırmızı', hex: '#ef4444' },
    { value: 'bg-yellow-500', label: 'Sarı', hex: '#eab308' },
    { value: 'bg-purple-500', label: 'Mor', hex: '#a855f7' },
    { value: 'bg-orange-500', label: 'Turuncu', hex: '#f97316' },
    { value: 'bg-pink-500', label: 'Pembe', hex: '#ec4899' },
    { value: 'bg-cyan-500', label: 'Turkuaz', hex: '#06b6d4' },
    { value: 'bg-white', label: 'Beyaz', hex: '#ffffff' },
];

export const TeamSettings: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCaptain, setIsCaptain] = useState(false);
    const [teamId, setTeamId] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [level, setLevel] = useState('BEGINNER');
    const [location, setLocation] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [primaryColor, setPrimaryColor] = useState('bg-blue-500');
    const [secondaryColor, setSecondaryColor] = useState('bg-purple-500');

    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const userRes = await api.get('/users/me');
                const user = userRes.data;
                if (!user.team) { navigate(-1); return; }

                const teamRes = await api.get(`/teams/${user.team.id}`);
                const team = teamRes.data;

                setTeamId(team.id);
                setName(team.name || '');
                setLevel(team.level || 'BEGINNER');
                setLocation(team.location || '');
                setLogoUrl(team.logoUrl || '');
                setPrimaryColor(team.primaryColor || 'bg-blue-500');
                setSecondaryColor(team.secondaryColor || 'bg-purple-500');

                const captain = team.captain;
                const isCap = (captain && captain.id === user.id) || team.captainId === user.id;
                setIsCaptain(isCap);
            } catch (err) {
                console.error('Failed to load team settings', err);
                setErrorMessage('Takım bilgileri yüklenemedi.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchTeam();
    }, [navigate]);

    const showSuccess = (msg: string) => {
        setSuccessMessage(msg);
        setErrorMessage('');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const showError = (msg: string) => {
        setErrorMessage(msg);
        setSuccessMessage('');
        setTimeout(() => setErrorMessage(''), 3000);
    };

    const handleSave = async () => {
        if (!teamId || !isCaptain) return;
        if (!name.trim()) { showError('Takım adı boş olamaz.'); return; }

        setIsSaving(true);
        try {
            await api.patch(`/teams/${teamId}`, {
                name: name.trim(),
                level,
                location: location.trim(),
                logoUrl: logoUrl.trim(),
                primaryColor,
                secondaryColor,
            });
            showSuccess('Takım ayarları güncellendi!');
        } catch (err: any) {
            showError(err.response?.data?.message || 'Güncelleme başarısız.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner fullScreen text="Yükleniyor..." />;

    const selectedLevel = LEVELS.find(l => l.value === level) || LEVELS[0];
    const selectedColor = PRIMARY_COLORS.find(c => c.value === primaryColor) || PRIMARY_COLORS[0];
    const selectedSecondary = PRIMARY_COLORS.find(c => c.value === secondaryColor) || PRIMARY_COLORS[4];
    const COLOR_HEX: Record<string, string> = {
        'bg-blue-500': '#3b82f6', 'bg-green-500': '#22c55e', 'bg-red-500': '#ef4444',
        'bg-yellow-500': '#eab308', 'bg-purple-500': '#a855f7', 'bg-orange-500': '#f97316',
        'bg-pink-500': '#ec4899', 'bg-cyan-500': '#06b6d4', 'bg-white': '#ffffff',
    };
    const toHex = (cls: string) => COLOR_HEX[cls] ?? '#3b82f6';

    return (
        <div className="min-h-screen bg-pitch pt-safe-top">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-pitch/95 backdrop-blur-md border-b border-slate-700/50 flex items-center gap-3 px-4 py-3">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-7 h-7" />
                </button>
                <div className="flex-1">
                    <h1 className="font-sport font-black text-2xl text-white italic tracking-wide uppercase">
                        Takım Ayarları
                    </h1>
                    {!isCaptain && (
                        <p className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" /> Sadece kaptan değişiklik yapabilir
                        </p>
                    )}
                </div>

            </header>

            {/* Toast Messages */}
            {successMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500/10 border border-green-500/50 text-green-400 px-6 py-3 rounded-xl flex items-center gap-3 animate-fade-in shadow-lg backdrop-blur-sm">
                    <Check className="w-5 h-5" /><p className="font-bold text-sm">{successMessage}</p>
                </div>
            )}
            {errorMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-3 rounded-xl flex items-center gap-3 animate-fade-in shadow-lg backdrop-blur-sm">
                    <X className="w-5 h-5" /><p className="font-bold text-sm">{errorMessage}</p>
                </div>
            )}

            <div className="px-4 py-6 space-y-5 pb-28">

                {/* Logo Preview */}
                <div className="flex flex-col items-center gap-3 py-4">
                    <div
                        className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center shadow-xl"
                        style={{ border: `3px solid ${toHex(primaryColor)}80`, background: `linear-gradient(135deg, ${toHex(primaryColor)}, ${toHex(secondaryColor)}88)` }}
                    >
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                            <span className="text-white font-black text-2xl">{name ? name.slice(0, 2).toUpperCase() : '?'}</span>
                        )}
                    </div>
                    <div className="text-center">
                        <p className="text-white font-bold text-lg">{name || 'Takım Adı'}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${selectedLevel.bg} ${selectedLevel.color}`}>
                            {selectedLevel.label}
                        </span>
                    </div>
                    {/* Color strip preview */}
                    <div className="flex gap-1.5 items-center">
                        <div className="w-6 h-6 rounded-full shadow" style={{ backgroundColor: toHex(primaryColor) }} />
                        <span className="text-slate-500 text-xs">+</span>
                        <div className="w-6 h-6 rounded-full shadow" style={{ backgroundColor: toHex(secondaryColor) }} />
                    </div>
                </div>

                {/* Takım Adı */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-2">
                    <label className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <Type className="w-3.5 h-3.5" /> Takım Adı
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        disabled={!isCaptain}
                        maxLength={40}
                        placeholder="Takım adınızı girin..."
                        className="w-full bg-slate-900/70 text-white font-bold text-lg px-4 py-3 rounded-xl border border-slate-600 focus:border-turf-500 focus:outline-none placeholder-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-500 text-right">{name.length}/40</p>
                </div>

                {/* Seviye */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
                    <label className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <BarChart2 className="w-3.5 h-3.5" /> Takım Seviyesi
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {LEVELS.map(l => (
                            <button
                                key={l.value}
                                onClick={() => isCaptain && setLevel(l.value)}
                                disabled={!isCaptain}
                                className={`py-3 px-4 rounded-xl border font-bold text-sm transition-all active:scale-95 ${level === l.value
                                    ? `${l.bg} ${l.color} shadow-lg`
                                    : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-700'
                                    } disabled:cursor-not-allowed`}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Konum */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-2">
                    <label className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <MapPin className="w-3.5 h-3.5" /> Konum
                    </label>
                    <input
                        type="text"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        disabled={!isCaptain}
                        placeholder="İstanbul, Kadıköy..."
                        className="w-full bg-slate-900/70 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-turf-500 focus:outline-none placeholder-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                </div>

                {/* Logo URL */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-2">
                    <label className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <Image className="w-3.5 h-3.5" /> Logo URL
                    </label>
                    <input
                        type="url"
                        value={logoUrl}
                        onChange={e => setLogoUrl(e.target.value)}
                        disabled={!isCaptain}
                        placeholder="https://example.com/logo.png"
                        className="w-full bg-slate-900/70 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-turf-500 focus:outline-none placeholder-slate-600 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                    />
                    <p className="text-xs text-slate-500">Takım logonuzun internet bağlantısı olan bir resim URL'si girin.</p>
                </div>

                {/* Takım Renkleri */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-4">
                    <label className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <Palette className="w-3.5 h-3.5" /> Takım Renkleri
                    </label>

                    {/* Ana Renk */}
                    <div className="space-y-2">
                        <p className="text-slate-300 text-sm font-bold">Ana Renk</p>
                        <div className="flex flex-wrap gap-3">
                            {PRIMARY_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => isCaptain && setPrimaryColor(c.value)}
                                    disabled={!isCaptain}
                                    title={c.label}
                                    className={`w-10 h-10 rounded-full transition-all active:scale-90 disabled:cursor-not-allowed ${primaryColor === c.value
                                        ? 'ring-4 ring-offset-2 ring-offset-slate-800 ring-white scale-110'
                                        : 'hover:scale-105'
                                        } ${c.value === 'bg-white' ? 'border border-slate-600' : ''}`}
                                    style={{ backgroundColor: c.hex }}
                                />
                            ))}
                        </div>
                        <p className="text-xs text-slate-500">Seçili: <span className="font-bold text-slate-300">{selectedColor.label}</span></p>
                    </div>

                    {/* İkincil Renk */}
                    <div className="space-y-2 pt-2 border-t border-slate-700">
                        <p className="text-slate-300 text-sm font-bold">İkincil Renk</p>
                        <div className="flex flex-wrap gap-3">
                            {PRIMARY_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => isCaptain && setSecondaryColor(c.value)}
                                    disabled={!isCaptain}
                                    title={c.label}
                                    className={`w-10 h-10 rounded-full transition-all active:scale-90 disabled:cursor-not-allowed ${secondaryColor === c.value
                                        ? 'ring-4 ring-offset-2 ring-offset-slate-800 ring-white scale-110'
                                        : 'hover:scale-105'
                                        } ${c.value === 'bg-white' ? 'border border-slate-600' : ''}`}
                                    style={{ backgroundColor: c.hex }}
                                />
                            ))}
                        </div>
                        <p className="text-xs text-slate-500">Seçili: <span className="font-bold text-slate-300">{selectedSecondary.label}</span></p>
                    </div>
                </div>

                {/* Save Button (bottom) */}
                {isCaptain && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-3 bg-turf-600 hover:bg-turf-500 disabled:opacity-50 text-white font-black text-lg py-4 rounded-2xl transition-all shadow-lg shadow-turf-600/20 active:scale-95"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        Değişiklikleri Kaydet
                    </button>
                )}
            </div>
        </div>
    );
};
