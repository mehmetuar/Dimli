import React from 'react';
import { IconBuilding } from '../../../components/Icons';
import Section from './Section';
import Row from './Row';

interface BusinessInfoSectionProps {
    editBusiness: Record<string, string>;
    setEditBusiness: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
    editMode: boolean;
    coverImageUrl?: string | null;
}

const BusinessInfoSection: React.FC<BusinessInfoSectionProps> = ({ editBusiness, setEditBusiness, editMode, coverImageUrl }) => (
    <Section title="İşletme Bilgileri" icon={<IconBuilding size={13} />}>
        <Row label="İşletme Adı" value={editBusiness.name}     editMode={editMode} onChange={v => setEditBusiness(p => ({ ...p, name: v }))} />
        <Row label="Şehir"       value={editBusiness.city}     editMode={editMode} onChange={v => setEditBusiness(p => ({ ...p, city: v }))} />
        <Row label="İlçe"        value={editBusiness.district} editMode={editMode} onChange={v => setEditBusiness(p => ({ ...p, district: v }))} />
        <Row label="Adres"       value={editBusiness.address}  editMode={editMode} onChange={v => setEditBusiness(p => ({ ...p, address: v }))} />
        {!editMode ? (
            <Row label="Çalışma Saatleri" value={`${editBusiness.openTime || '–'} – ${editBusiness.closeTime || '–'}`} />
        ) : (
            <div className="flex gap-2 py-2">
                <div className="flex-1">
                    <p className="text-slate-400 text-xs mb-1">Açılış</p>
                    <input
                        type="time"
                        value={editBusiness.openTime}
                        onChange={e => setEditBusiness(p => ({ ...p, openTime: e.target.value }))}
                        className="w-full bg-[#253352] border border-slate-600/60 text-[#dde8f5] px-2.5 py-1 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                    />
                </div>
                <div className="flex-1">
                    <p className="text-slate-400 text-xs mb-1">Kapanış</p>
                    <input
                        type="time"
                        value={editBusiness.closeTime}
                        onChange={e => setEditBusiness(p => ({ ...p, closeTime: e.target.value }))}
                        className="w-full bg-[#253352] border border-slate-600/60 text-[#dde8f5] px-2.5 py-1 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                    />
                </div>
            </div>
        )}
        <div className="py-2">
            <p className="text-slate-400 text-xs mb-1.5">İşletme Fotoğrafı</p>
            {coverImageUrl ? (
                <img
                    src={coverImageUrl}
                    alt="İşletme fotoğrafı"
                    className="w-full max-w-[280px] aspect-video object-cover rounded-lg border border-slate-600/60"
                />
            ) : (
                <p className="text-slate-500 text-xs italic">Fotoğraf yüklenmemiş</p>
            )}
        </div>
    </Section>
);

export default BusinessInfoSection;
