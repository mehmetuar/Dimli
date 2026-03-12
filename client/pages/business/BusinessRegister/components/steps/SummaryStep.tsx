import React from 'react';

const SummaryItem = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
        <span className="text-slate-400 font-bold">{label}</span>
        <span className="text-white truncate max-w-[200px]">{value}</span>
    </div>
);

interface SummaryStepProps {
    formData: any;
}

export const SummaryStep: React.FC<SummaryStepProps> = ({ formData }) => {
    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-4">Özet ve Onay</h2>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 space-y-3 text-sm">
                <SummaryItem label="Yetkili" value={`${formData.owner.fullName} (${formData.owner.email})`} />
                <SummaryItem label="İşletme" value={`${formData.business.name}`} />
                <SummaryItem label="Adres" value={`${formData.business.city} / ${formData.business.district}`} />
                <SummaryItem label="Telefon" value={formData.business.phone} />
                <SummaryItem label="Saha Sayısı" value={`${formData.pitches.length} Adet`} />
                <div className="border-t border-slate-800 pt-2 mt-2">
                    <p className="text-slate-400 text-xs mb-1">Sahalar:</p>
                    {formData.pitches.map((p: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs text-slate-300">
                            <span>{p.name} ({p.type})</span>
                            <span className="font-bold text-orange-400">{p.pricePerHour} TL</span>
                        </div>
                    ))}
                </div>
            </div>
            <p className="text-xs text-slate-500 text-center mt-4">
                "Kaydı Tamamla" butonuna tıklayarak hizmet şartlarını kabul etmiş olursunuz.
            </p>
        </div>
    );
};
