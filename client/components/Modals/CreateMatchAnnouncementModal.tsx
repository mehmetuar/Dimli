import React, { useState } from 'react';
import { X, Calendar, Clock, Users, MapPin } from 'lucide-react';
import { KeyboardAwareModal } from './KeyboardAwareModal';

interface CreateMatchAnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    preSelectedPitchId?: string;
    pitchName?: string;
}

export const CreateMatchAnnouncementModal: React.FC<CreateMatchAnnouncementModalProps> = ({
    isOpen,
    onClose,
    preSelectedPitchId,
    pitchName
}) => {
    const [formData, setFormData] = useState({
        date: '',
        time: '',
        playerCount: '11',
        description: ''
    });

    const handleSubmit = () => {
        // TODO: API call to create match announcement
        console.log('Match announcement:', {
            ...formData,
            pitchId: preSelectedPitchId
        });
        onClose();
    };

    return (
        <KeyboardAwareModal
            isOpen={isOpen}
            zClassName="z-50"
            backdropClassName="bg-black/70 backdrop-blur-sm animate-fade-in"
            panelClassName="bg-slate-800 w-full max-w-lg rounded-3xl border border-slate-600 shadow-2xl"
            bodyClassName="p-6 space-y-4"
            header={
                <div className="p-6 border-b border-slate-700">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-sport font-bold text-white uppercase italic">
                            Maç İlanı Oluştur
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            }
            footer={
                <div className="p-6 border-t border-slate-700 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 py-3 rounded-xl font-bold bg-turf-600 hover:bg-turf-500 text-white transition-colors shadow-lg"
                    >
                        İlanı Yayınla
                    </button>
                </div>
            }
        >
                    {/* Selected Pitch */}
                    {pitchName && (
                        <div className="bg-turf-900/20 border border-turf-500/30 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-turf-400">
                                <MapPin className="w-4 h-4" />
                                <span className="font-bold text-sm">Ev Sahibi Saha:</span>
                                <span className="text-white">{pitchName}</span>
                            </div>
                        </div>
                    )}

                    {/* Date */}
                    <div>
                        <label className="block text-slate-300 text-sm font-bold mb-2">
                            <Calendar className="w-4 h-4 inline mr-2" />
                            Tarih
                        </label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-turf-500 focus:outline-none"
                        />
                    </div>

                    {/* Time */}
                    <div>
                        <label className="block text-slate-300 text-sm font-bold mb-2">
                            <Clock className="w-4 h-4 inline mr-2" />
                            Saat
                        </label>
                        <input
                            type="time"
                            value={formData.time}
                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-turf-500 focus:outline-none"
                        />
                    </div>

                    {/* Player Count */}
                    <div>
                        <label className="block text-slate-300 text-sm font-bold mb-2">
                            <Users className="w-4 h-4 inline mr-2" />
                            Oyuncu Sayısı
                        </label>
                        <select
                            value={formData.playerCount}
                            onChange={(e) => setFormData({ ...formData, playerCount: e.target.value })}
                            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-turf-500 focus:outline-none"
                        >
                            <option value="5">5v5</option>
                            <option value="6">6v6</option>
                            <option value="7">7v7</option>
                            <option value="8">8v8</option>
                            <option value="11">11v11</option>
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-slate-300 text-sm font-bold mb-2">
                            Açıklama (İsteğe Bağlı)
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Maç hakkında ek bilgiler..."
                            rows={3}
                            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-turf-500 focus:outline-none resize-none"
                        />
                    </div>
        </KeyboardAwareModal>
    );
};
