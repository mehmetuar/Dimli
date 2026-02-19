
import React, { useState } from 'react';
import { X, Shield, MapPin, Trophy, CheckCircle, Palette, AlertCircle } from 'lucide-react';
import { Team } from '../types';
import { CURRENT_USER, MOCK_TEAMS } from '../constants';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (teamData: Partial<Team>) => void;
}

export const CreateTeamModal: React.FC<Props> = ({ isOpen, onClose, onCreate }) => {
    if (!isOpen) return null;

    const [name, setName] = useState('');
    const [location, setLocation] = useState(CURRENT_USER.location || '');
    const [level, setLevel] = useState('BEGINNER');
    const [color, setColor] = useState('bg-red-500');
    const [secondaryColor, setSecondaryColor] = useState('bg-blue-500');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');

    const LEVELS = [
        { value: 'BEGINNER', label: 'Başlangıç' },
        { value: 'INTERMEDIATE', label: 'Orta' },
        { value: 'ADVANCED', label: 'İleri' },
        { value: 'PRO', label: 'Profesyonel' },
    ];

    const colors = [
        { class: 'bg-blue-500', label: 'Mavi' },
        { class: 'bg-green-500', label: 'Yeşil' },
        { class: 'bg-red-500', label: 'Kırmızı' },
        { class: 'bg-yellow-500', label: 'Sarı' },
        { class: 'bg-purple-500', label: 'Mor' },
        { class: 'bg-orange-500', label: 'Turuncu' },
        { class: 'bg-pink-500', label: 'Pembe' },
        { class: 'bg-cyan-500', label: 'Turkuaz' },
        { class: 'bg-white', label: 'Beyaz' },
    ];

    const handleSubmit = () => {
        setError('');

        if (!name || !location) return;

        // Check for unique name
        const nameExists = MOCK_TEAMS.some(t => t.name.toLowerCase() === name.trim().toLowerCase());
        if (nameExists) {
            setError('Bu takım ismi zaten alınmış. Lütfen başka bir isim seçin.');
            return;
        }

        const newTeam: Partial<Team> = {
            name: name.trim(),
            location,
            level,
            primaryColor: color,
            secondaryColor,
            description: description || 'Sahaların yeni yıldızı.',
            captainId: CURRENT_USER.id,
            fairPlayScore: 5.0,
            wins: 0,
            losses: 0,
            logoUrl: `https://ui-avatars.com/api/?name=${name}&background=random&color=fff&size=200`,
        };

        onCreate(newTeam);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/90 backdrop-blur-sm animate-fade-in">
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

                    {/* Team Name */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
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
                        <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center gap-2">
                            <Palette className="w-4 h-4" /> Forma Renkleri
                        </label>

                        {/* Ana Renk */}
                        <p className="text-xs text-slate-400 font-bold mb-2">Ana Renk</p>
                        <div className="flex flex-wrap gap-3 mb-4">
                            {colors.map((c) => (
                                <button
                                    key={c.class}
                                    onClick={() => setColor(c.class)}
                                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 ${c.class} ${color === c.class ? 'border-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent'}`}
                                >
                                    {color === c.class && <CheckCircle className="w-5 h-5 text-white mix-blend-difference" />}
                                </button>
                            ))}
                        </div>

                        {/* İkincil Renk */}
                        <p className="text-xs text-slate-400 font-bold mb-2">İkincil Renk</p>
                        <div className="flex flex-wrap gap-3">
                            {colors.map((c) => (
                                <button
                                    key={c.class}
                                    onClick={() => setSecondaryColor(c.class)}
                                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 ${c.class} ${secondaryColor === c.class ? 'border-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent'}`}
                                >
                                    {secondaryColor === c.class && <CheckCircle className="w-5 h-5 text-white mix-blend-difference" />}
                                </button>
                            ))}
                        </div>

                        {/* Preview */}
                        <div className="mt-3 flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full ${color}`} />
                            <span className="text-slate-500 text-xs">+</span>
                            <div className={`w-5 h-5 rounded-full ${secondaryColor}`} />
                            <span className="text-xs text-slate-500 ml-1">Seçilen renkler</span>
                        </div>
                    </div>

                    {/* Location & Level */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Bölge
                            </label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="İlçe/Semt"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-turf-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
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
                <div className="p-4 bg-slate-900 border-t border-slate-800 sticky bottom-0">
                    <button
                        onClick={handleSubmit}
                        disabled={!name || !location}
                        className="w-full bg-turf-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black uppercase italic py-4 rounded-xl text-lg shadow-lg shadow-turf-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        Takımı Oluştur
                    </button>
                </div>

            </div>
        </div>
    );
};
