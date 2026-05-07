import React from 'react';
import {
    IconPitch, IconIndoor, IconOutdoor, IconImage, IconClock,
} from '../../../components/Icons';
import { EditPitch } from '../types';
import FacilitiesEdit from './FacilitiesEdit';
import FacilityChips from './FacilityChips';
import TimeSlotsEdit from './TimeSlotsEdit';

interface PitchCardProps {
    pitch: any;
    editPitch: EditPitch | undefined;
    editMode: boolean;
    index: number;
    updatePitch: (pitchId: string, changes: Partial<EditPitch>) => void;
}

const PitchCard: React.FC<PitchCardProps> = ({ pitch, editPitch, editMode, index, updatePitch }) => {
    const ep = editPitch;

    return (
        <div className="bg-[#253352] rounded-xl p-4 border border-slate-600/40 space-y-4">
            {/* Başlık: isim, tür, fiyat */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <IconPitch size={14} className="text-orange-400 shrink-0" />
                    {editMode && ep ? (
                        <input
                            value={ep.name}
                            onChange={e => updatePitch(pitch.id, { name: e.target.value })}
                            className="bg-[#1e2d47] border border-slate-600/60 text-orange-300 font-black text-sm px-2 py-1 rounded-lg focus:outline-none focus:border-orange-500 flex-1 min-w-0"
                        />
                    ) : (
                        <h4 className="font-black text-orange-300 text-sm">{index + 1}. {pitch.name}</h4>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {editMode && ep ? (
                        <>
                            <select
                                value={ep.type}
                                onChange={e => updatePitch(pitch.id, { type: e.target.value })}
                                className="bg-[#1e2d47] border border-slate-600/50 text-slate-300 text-xs font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-orange-500"
                            >
                                <option value="">Tür Seçin</option>
                                <option value="INDOOR">Kapalı</option>
                                <option value="OUTDOOR">Açık</option>
                            </select>
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    value={ep.pricePerHour}
                                    onChange={e => updatePitch(pitch.id, { pricePerHour: e.target.value })}
                                    className="w-20 bg-[#1e2d47] border border-slate-600/60 text-orange-300 font-black text-xs px-2 py-1 rounded-lg focus:outline-none focus:border-orange-500 text-right"
                                />
                                <span className="text-orange-300 text-xs font-bold">₺/saat</span>
                            </div>
                        </>
                    ) : (
                        <>
                            {pitch.type && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-[#1e2d47] text-slate-300 border border-slate-600/50">
                                    {pitch.type === 'INDOOR' ? <><IconIndoor size={11} /> Kapalı</> : <><IconOutdoor size={11} /> Açık</>}
                                </span>
                            )}
                            <span className="text-orange-300 text-xs font-bold">
                                {pitch.pricePerHour?.toLocaleString('tr-TR') || '–'} ₺/saat
                            </span>
                        </>
                    )}
                </div>
            </div>

            <div className="border-t border-slate-600/30" />

            {/* Fotoğraf */}
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wide flex items-center gap-1.5">
                    <IconImage size={12} className="text-slate-500" />
                    Fotoğraf
                </p>
                {editMode && ep ? (
                    <div className="space-y-2">
                        {ep.imageUrl && (
                            <img
                                src={ep.imageUrl}
                                alt="Önizleme"
                                className="w-full aspect-video object-cover rounded-lg border border-slate-600/50"
                                onError={e => (e.currentTarget.style.display = 'none')}
                            />
                        )}
                        <input
                            value={ep.imageUrl}
                            onChange={e => updatePitch(pitch.id, { imageUrl: e.target.value })}
                            placeholder="Fotoğraf URL'sini yapıştırın..."
                            className="w-full bg-[#1e2d47] border border-slate-600/60 text-[#dde8f5] px-3 py-1.5 rounded-lg focus:outline-none focus:border-orange-500 text-xs placeholder-slate-500"
                        />
                    </div>
                ) : pitch.imageUrl ? (
                    <img
                        src={pitch.imageUrl}
                        alt={pitch.name}
                        className="w-full aspect-video object-cover rounded-lg border border-slate-600/50"
                    />
                ) : (
                    <p className="text-slate-500 text-xs italic">Fotoğraf yüklenmemiş</p>
                )}
            </div>

            <div className="border-t border-slate-600/30" />

            {/* İmkanlar */}
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wide">İmkanlar</p>
                {editMode && ep ? (
                    <FacilitiesEdit
                        facilities={ep.facilities}
                        onChange={f => updatePitch(pitch.id, { facilities: f })}
                    />
                ) : (
                    <FacilityChips facilities={pitch.facilities} />
                )}
            </div>

            <div className="border-t border-slate-600/30" />

            {/* Saat Slotları */}
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wide">Saat Slotları</p>
                {editMode && ep ? (
                    <TimeSlotsEdit
                        slots={ep.timeSlots}
                        onChange={s => updatePitch(pitch.id, { timeSlots: s })}
                    />
                ) : (
                    <>
                        {(!pitch.timeSlots || pitch.timeSlots.length === 0) ? (
                            <p className="text-slate-500 text-xs italic flex items-center gap-1">
                                <IconClock size={12} className="text-slate-600" />
                                Varsayılan saatler kullanılıyor
                            </p>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-1.5">
                                    {[...pitch.timeSlots]
                                        .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime))
                                        .map((slot: any) => (
                                            <span
                                                key={slot.id}
                                                className={`inline-block font-mono text-xs px-2 py-1 rounded-md border ${slot.isActive
                                                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                                                    : 'bg-slate-800/60 border-slate-700/60 text-slate-500 line-through opacity-50'}`}
                                            >
                                                {slot.startTime}–{slot.endTime}
                                            </span>
                                        ))}
                                </div>
                                <p className="text-slate-500 text-xs">
                                    {pitch.timeSlots.filter((s: any) => s.isActive).length} aktif / {pitch.timeSlots.length} toplam
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PitchCard;
