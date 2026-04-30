import React from 'react';
import { Shield } from 'lucide-react';

interface PlayerProfileStepProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    fieldErrors: Record<string, string>;
}

export const PlayerProfileStep: React.FC<PlayerProfileStepProps> = ({ formData, handleChange, fieldErrors }) => {
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Oyuncu Profili</h2>
                <p className="text-slate-400 text-sm">Saha içindeki özelliklerin</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mevki</label>
                    <div className="relative">
                        <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <select
                            name="position"
                            value={formData.position}
                            onChange={handleChange}
                            className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold appearance-none"
                        >
                            <option value="Kaleci">Kaleci</option>
                            <option value="Defans">Defans</option>
                            <option value="Orta Saha">Orta Saha</option>
                            <option value="Forvet">Forvet</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Yedek Mevki</label>
                    <div className="relative">
                        <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <select
                            name="secondaryPosition"
                            value={formData.secondaryPosition}
                            onChange={handleChange}
                            className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold appearance-none"
                        >
                            <option value="">Seçiniz</option>
                            <option value="Kaleci">Kaleci</option>
                            <option value="Defans">Defans</option>
                            <option value="Orta Saha">Orta Saha</option>
                            <option value="Forvet">Forvet</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kullandığı Ayak</label>
                    <div className="relative">
                        <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <select
                            name="foot"
                            value={formData.foot}
                            onChange={handleChange}
                            className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold appearance-none"
                        >
                            <option value="Sağ">Sağ</option>
                            <option value="Sol">Sol</option>
                            <option value="Her İkisi">Her İkisi</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};
