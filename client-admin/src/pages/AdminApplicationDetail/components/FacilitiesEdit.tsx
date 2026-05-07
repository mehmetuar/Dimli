import React, { useState } from 'react';
import { getFacilityIcon, FACILITY_ICON_MAP, IconX, IconPlus } from '../../../components/Icons';

const ALL_FACILITIES = Object.keys(FACILITY_ICON_MAP);

interface FacilitiesEditProps {
    facilities: string[];
    onChange: (f: string[]) => void;
}

const FacilitiesEdit: React.FC<FacilitiesEditProps> = ({ facilities, onChange }) => {
    const [customInput, setCustomInput] = useState('');
    const [showPreset, setShowPreset] = useState(false);

    const remove = (f: string) => onChange(facilities.filter(x => x !== f));
    const add = (f: string) => {
        if (f.trim() && !facilities.includes(f.trim())) onChange([...facilities, f.trim()]);
    };
    const addCustom = () => {
        add(customInput);
        setCustomInput('');
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
                {facilities.length === 0 && <p className="text-slate-500 text-xs italic">Henüz imkan yok</p>}
                {facilities.map(f => {
                    const FIcon = getFacilityIcon(f);
                    return (
                        <span key={f} className="inline-flex items-center gap-1.5 bg-[#1e2d47] border border-slate-600/50 text-slate-200 text-xs font-medium px-2.5 py-1 rounded-full group">
                            <FIcon size={11} className="text-orange-400 shrink-0" />
                            {f}
                            <button onClick={() => remove(f)} className="ml-0.5 text-slate-500 hover:text-red-400 transition-colors">
                                <IconX size={10} />
                            </button>
                        </span>
                    );
                })}
            </div>

            <div>
                <button
                    onClick={() => setShowPreset(p => !p)}
                    className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-bold transition-colors"
                >
                    <IconPlus size={12} />
                    {showPreset ? 'Listeyi Kapat' : 'Hazır İmkandan Ekle'}
                </button>
                {showPreset && (
                    <div className="mt-2 grid grid-cols-2 gap-1">
                        {ALL_FACILITIES.filter(f => !facilities.includes(f)).map(f => {
                            const FIcon = getFacilityIcon(f);
                            return (
                                <button
                                    key={f}
                                    onClick={() => add(f)}
                                    className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-orange-300 hover:bg-white/5 px-2 py-1.5 rounded-lg transition-all text-left"
                                >
                                    <FIcon size={11} className="text-slate-500 shrink-0" />
                                    {f}
                                </button>
                            );
                        })}
                        {ALL_FACILITIES.every(f => facilities.includes(f)) && (
                            <p className="text-slate-500 text-xs italic col-span-2">Tüm hazır imkanlar eklenmiş</p>
                        )}
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <input
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustom()}
                    placeholder="Özel imkan ekle..."
                    className="flex-1 bg-[#253352] border border-slate-600/60 text-[#dde8f5] px-3 py-1.5 rounded-lg focus:outline-none focus:border-orange-500 text-xs placeholder-slate-500"
                />
                <button
                    onClick={addCustom}
                    disabled={!customInput.trim()}
                    className="flex items-center gap-1 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                >
                    <IconPlus size={12} /> Ekle
                </button>
            </div>
        </div>
    );
};

export default FacilitiesEdit;
