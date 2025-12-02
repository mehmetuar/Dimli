
import React, { useState } from 'react';
import { X, MapPin, Calendar, Clock, Shield, ChevronRight, CheckCircle, Trophy, Filter } from 'lucide-react';
import { MOCK_PITCHES, MOCK_TEAMS, CURRENT_USER } from '../constants';
import { SkillLevel } from '../types';
import api from '../services/api';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    preSelectedPitchId?: string;
    preSelectedHour?: number;
}

export const CreateMatchModal: React.FC<Props> = ({ isOpen, onClose, preSelectedPitchId, preSelectedHour }) => {
    if (!isOpen) return null;

    const [step, setStep] = useState(1);
    const [selectedPitchId, setSelectedPitchId] = useState(preSelectedPitchId || '');
    const [selectedRegion, setSelectedRegion] = useState('TÜMÜ');

    // Get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [date, setDate] = useState(getTodayDate());
    const [time, setTime] = useState(preSelectedHour ? `${preSelectedHour}:00` : '');
    const [note, setNote] = useState('');
    const [level, setLevel] = useState<SkillLevel>(SkillLevel.INTERMEDIATE);
    const [playerCount, setPlayerCount] = useState(10); // Default to 10 players

    const myTeam = MOCK_TEAMS.find(t => t.id === CURRENT_USER.teamId);

    const handleSubmit = async () => {
        try {
            await api.post('/match-announcements', {
                pitchId: selectedPitchId,
                date,
                time,
                playerCount: parseInt(playerCount as any), // Cast to any to satisfy parseInt type, as it expects string
                description: note
            });

            alert('Maç ilanı başarıyla yayınlandı!');
            onClose();
        } catch (error) {
            console.error('Failed to create match announcement:', error);
            alert('İlan oluşturulamıyor. Lütfen tekrar deneyin.');
        }
    };
    const selectedPitch = MOCK_PITCHES.find(p => p.id === selectedPitchId);

    // Filter Logic
    const regions = ['TÜMÜ', ...new Set(MOCK_PITCHES.map(p => p.location))];
    const filteredPitches = selectedRegion === 'TÜMÜ'
        ? MOCK_PITCHES
        : MOCK_PITCHES.filter(p => p.location === selectedRegion);

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-lg sm:rounded-3xl rounded-t-3xl border border-slate-700 shadow-2xl shadow-turf-500/10 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-slate-900 flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h2 className="font-sport font-black text-2xl text-white italic uppercase tracking-wide">
                            MAÇ <span className="text-turf-500">KUR</span>
                        </h2>
                        <p className="text-slate-400 text-xs">Takımını topla, rakibini çağır.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Scrollable */}
                <div className="p-6 overflow-y-auto flex-1">

                    {/* Step 1: Pitch Selection */}
                    <div className="mb-8 animate-fade-in">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-turf-600 text-slate-900 flex items-center justify-center text-[10px]">1</span>
                            Saha Seçimi
                        </label>

                        {!preSelectedPitchId ? (
                            <>
                                {/* Region Filter Pills */}
                                <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-2">
                                    {regions.map(region => (
                                        <button
                                            key={region}
                                            onClick={() => setSelectedRegion(region)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${selectedRegion === region
                                                ? 'bg-turf-600 text-white'
                                                : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-turf-500'
                                                }`}
                                        >
                                            {region}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    {filteredPitches.map(pitch => (
                                        <div
                                            key={pitch.id}
                                            onClick={() => setSelectedPitchId(pitch.id)}
                                            className={`relative p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${selectedPitchId === pitch.id ? 'bg-turf-900/20 border-turf-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
                                        >
                                            <img src={pitch.imageUrl} className="w-14 h-14 rounded-lg object-cover" />
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-bold text-sm truncate ${selectedPitchId === pitch.id ? 'text-turf-400' : 'text-white'}`}>{pitch.name}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {pitch.location}
                                                </div>
                                            </div>

                                            {/* Price Badge */}
                                            <div className="absolute top-2 right-2 bg-slate-800 px-2 py-0.5 rounded border border-slate-600 shadow-sm">
                                                <span className="text-white font-sport font-bold text-sm">₺{pitch.pricePerHour}</span>
                                            </div>

                                            {selectedPitchId === pitch.id && (
                                                <div className="bg-turf-500 rounded-full p-1 absolute -right-1 -bottom-1 shadow-neon">
                                                    <CheckCircle className="w-4 h-4 text-slate-900" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex items-center gap-3 relative">
                                <img src={selectedPitch?.imageUrl} className="w-12 h-12 rounded-lg object-cover" />
                                <div>
                                    <div className="font-bold text-white text-sm">{selectedPitch?.name}</div>
                                    <div className="text-xs text-slate-500">{selectedPitch?.location}</div>
                                </div>
                                <span className="ml-auto text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700">Sabitlendi</span>
                                {/* Price Badge for Pre-selected */}
                                <div className="absolute top-2 right-20 bg-slate-800 px-2 py-0.5 rounded border border-slate-600">
                                    <span className="text-white font-sport font-bold text-xs">₺{selectedPitch?.pricePerHour}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Date & Time */}
                    <div className="mb-8 animate-fade-in delay-75">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-turf-600 text-slate-900 flex items-center justify-center text-[10px]">2</span>
                            Zamanlama
                        </label>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                    <input
                                        type="date"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-white text-sm focus:border-turf-500 focus:outline-none"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-white text-sm focus:border-turf-500 focus:outline-none appearance-none"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                    >
                                        <option value="">Saat Seç</option>
                                        {Array.from({ length: 14 }, (_, i) => i + 10).map(h => (
                                            <option key={h} value={`${h}:00`}>{h}:00 - {h + 1}:00</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Details */}
                    <div className="mb-4 animate-fade-in delay-150">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-turf-600 text-slate-900 flex items-center justify-center text-[10px]">3</span>
                            Detaylar
                        </label>

                        <div className="space-y-4">
                            <div>
                                <span className="text-xs text-slate-400 mb-2 block">Aranan Rakip Seviyesi</span>
                                <div className="flex p-1 bg-slate-900 rounded-lg">
                                    {Object.values(SkillLevel).map((lvl) => (
                                        <button
                                            key={lvl}
                                            onClick={() => setLevel(lvl)}
                                            className={`flex-1 py-2 text-[10px] font-bold rounded transition-colors ${level === lvl ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            {lvl}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <span className="text-xs text-slate-400 mb-2 block">Kaptan Notu</span>
                                <textarea
                                    rows={3}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-turf-500 focus:outline-none"
                                    placeholder="Örn: Forma rengimiz siyah. İddialıyız."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-slate-900 border-t border-slate-800 sticky bottom-0 z-10">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Tahmini Saha Payı</div>
                            <div className="text-lg font-bold text-white">₺{selectedPitch ? selectedPitch.pricePerHour / 2 : '0'}</div>
                        </div>
                        {myTeam && (
                            <div className="flex items-center gap-2">
                                <img src={myTeam.logoUrl} className="w-8 h-8 rounded-full border border-slate-600" />
                                <span className="text-sm font-bold text-white">{myTeam.name}</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!selectedPitchId || !date || !time}
                        className="w-full bg-turf-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black uppercase italic py-4 rounded-xl text-lg shadow-lg shadow-turf-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Trophy className="w-5 h-5" /> İlanı Yayınla
                    </button>
                </div>

            </div>
        </div>
    );
};
