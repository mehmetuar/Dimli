
import React, { useState } from 'react';
import { X, CheckCircle, MapPin, Handshake, Power, Shield, User } from 'lucide-react';
import { MOCK_PITCHES, CURRENT_USER } from '../constants';
import { Position } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export const JokerProfileModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  if (!isOpen) return null;

  const [position, setPosition] = useState<Position>(CURRENT_USER.position || Position.MID);
  const [selectedPitches, setSelectedPitches] = useState<string[]>(CURRENT_USER.favoritePitchIds || []);
  const [isFeeShared, setIsFeeShared] = useState(CURRENT_USER.sharesFee ?? true);
  const [isActive, setIsActive] = useState(CURRENT_USER.isJoker);

  const togglePitch = (pitchId: string) => {
    setSelectedPitches(prev => 
      prev.includes(pitchId) ? prev.filter(id => id !== pitchId) : [...prev, pitchId]
    );
  };

  const handleSave = () => {
    const data = {
        position,
        favoritePitchIds: selectedPitches,
        sharesFee: isFeeShared,
        isJoker: isActive
    };
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-800 w-full max-w-lg sm:rounded-3xl rounded-t-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-700 bg-slate-900 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="font-sport font-black text-2xl text-white italic uppercase tracking-wide">
              JOKER <span className="text-turf-500">AYARLARI</span>
            </h2>
            <p className="text-slate-400 text-xs">Kartını oluştur, sahalara in.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8">
            
            {/* Status Toggle */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-turf-500/20 text-turf-500' : 'bg-slate-800 text-slate-500'}`}>
                        <Power className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="font-bold text-white text-sm">Joker Modu</div>
                        <div className="text-xs text-slate-400">{isActive ? 'Şu an havuzda görünüyorsun.' : 'Gizli moddasın, teklif alamazsın.'}</div>
                    </div>
                </div>
                <button 
                    onClick={() => setIsActive(!isActive)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors relative ${isActive ? 'bg-turf-600' : 'bg-slate-700'}`}
                >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
            </div>

            {/* Position Selection */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Mevki Seçimi
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {Object.values(Position).map(pos => (
                        <button
                            key={pos}
                            onClick={() => setPosition(pos)}
                            className={`p-3 rounded-xl border font-bold text-sm transition-all flex items-center justify-between ${
                                position === pos 
                                ? 'bg-slate-700 border-turf-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                            }`}
                        >
                            {pos}
                            {position === pos && <CheckCircle className="w-4 h-4 text-turf-500" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Pitch Selection */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Oynadığın Sahalar
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {MOCK_PITCHES.map(pitch => {
                        const isSelected = selectedPitches.includes(pitch.id);
                        return (
                            <div 
                                key={pitch.id}
                                onClick={() => togglePitch(pitch.id)}
                                className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                                    isSelected 
                                    ? 'bg-turf-900/20 border-turf-500/50' 
                                    : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-turf-500 border-turf-500' : 'border-slate-600 bg-slate-800'}`}>
                                    {isSelected && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                                </div>
                                <div className="flex-1">
                                    <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>{pitch.name}</div>
                                    <div className="text-[10px] text-slate-500">{pitch.location}</div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Fee Sharing */}
            <div>
                 <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center gap-2">
                    <Handshake className="w-4 h-4" /> Ücret Tercihi
                </label>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isFeeShared ? 'bg-green-500/20 text-green-500' : 'bg-slate-800 text-slate-500'}`}>
                            <Handshake className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-white text-sm">Saha Ücretine Ortağım</div>
                            <div className="text-xs text-slate-400">Takımın ödeyeceği ücrete dahil olursun.</div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsFeeShared(!isFeeShared)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors relative ${isFeeShared ? 'bg-green-600' : 'bg-slate-700'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isFeeShared ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 sticky bottom-0 z-10">
            <button 
                onClick={handleSave}
                className="w-full bg-turf-600 text-white font-black uppercase italic py-4 rounded-xl text-lg shadow-lg shadow-turf-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                Değişiklikleri Kaydet
            </button>
        </div>

      </div>
    </div>
  );
};
