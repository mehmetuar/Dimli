import React from 'react';
import { Star, TrendingUp, Calendar, RotateCw, Lock } from 'lucide-react';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';
import { useBusinessStats, PitchStats } from './hooks/useBusinessStats';

const formatCurrency = (amount: number): string => {
    return `₺${amount.toLocaleString('tr-TR')}`;
};

const StatCell: React.FC<{ label: string; value: string; sub?: string; accent?: boolean }> = ({
    label, value, sub, accent
}) => (
    <div className="flex flex-col items-center justify-center py-3 px-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300/50 mb-1">{label}</span>
        <span className={`text-lg font-black leading-none ${accent ? 'text-green-600' : 'text-white'}`}>{value}</span>
        {sub && <span className="text-[10px] text-slate-500 mt-0.5 font-medium">{sub}</span>}
    </div>
);

const PitchCard: React.FC<{ pitch: PitchStats }> = ({ pitch }) => (
    <div className="bg-[#0e1e3a] rounded-2xl border border-blue-900/40 overflow-hidden">
        {/* Pitch header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0a1628] border-b border-blue-900/40">
            <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-500 rounded-full" />
                <span className="font-black italic uppercase tracking-tight text-white text-sm">
                    {pitch.pitchName}
                </span>
            </div>
            <span className="text-xs font-black text-indigo-300 italic">
                {formatCurrency(pitch.pricePerHour)}/saat
            </span>
        </div>

        {/* Stats grid: 2 columns (Bugün | Bu Ay) */}
        <div className="grid grid-cols-2 divide-x divide-blue-900/40">
            {/* Bugün */}
            <div className="flex flex-col">
                <div className="text-center py-2 bg-blue-950/30 border-b border-blue-900/30">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-100">
                        Bugün
                    </span>
                </div>
                <StatCell label="Maç" value={String(pitch.today.confirmedCount)} />
                <div className="border-t border-blue-900/30">
                    <StatCell label="Kazanç" value={formatCurrency(pitch.today.earnings)} accent />
                </div>
                <div className="border-t border-blue-900/30">
                    <StatCell
                        label="Manuel"
                        value={String(pitch.today.manualFillCount)}
                        sub="saha kapalı"
                    />
                </div>
            </div>

            {/* Bu Ay */}
            <div className="flex flex-col">
                <div className="text-center py-2 bg-blue-950/30 border-b border-blue-900/30">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-100">
                        Bu Ay
                    </span>
                </div>
                <StatCell label="Maç" value={String(pitch.thisMonth.confirmedCount)} />
                <div className="border-t border-blue-900/30">
                    <StatCell label="Kazanç" value={formatCurrency(pitch.thisMonth.earnings)} accent />
                </div>
                <div className="border-t border-blue-900/30">
                    <StatCell
                        label="Manuel"
                        value={String(pitch.thisMonth.manualFillCount)}
                        sub="saha kapalı"
                    />
                </div>
            </div>
        </div>
    </div>
);

export const BusinessStats: React.FC = () => {
    const { stats, loading, error, refetch } = useBusinessStats();

    if (loading) return <BusinessLoadingSpinner fullScreen />;

    if (error || !stats) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#060e1c] to-[#0a1628] flex flex-col items-center justify-center gap-4 text-white pb-24">
                <span className="text-slate-400 font-bold text-sm">{error || 'Veri bulunamadı.'}</span>
                <button
                    onClick={refetch}
                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 rounded-xl font-black uppercase italic text-sm"
                >
                    <RotateCw className="w-4 h-4" /> Tekrar Dene
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#060e1c] to-[#0a1628] text-white pb-28">

            {/* Header */}
            <div className="bg-gradient-to-b from-[#0a1628] to-[#0f1e3a] p-4 border-b border-blue-900/60 shadow-xl">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="font-sport font-black text-2xl text-orange-500 italic tracking-tighter uppercase drop-shadow-sm">
                            {stats.businessName}
                        </h1>
                        <div className="text-[10px] text-blue-300/60 font-bold uppercase tracking-widest mt-0.5">
                            Özet & İstatistik
                        </div>
                    </div>
                    <button
                        onClick={refetch}
                        className="p-2.5 bg-blue-900/40 rounded-xl border border-blue-800/50 text-blue-300/60 hover:text-white transition-colors active:scale-95"
                    >
                        <RotateCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">

                {/* Değerlendirme Kartı */}
                <div className="bg-[#0e1e3a] rounded-2xl border border-blue-900/40 p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center shrink-0">
                        <Star className="w-7 h-7 text-yellow-400 fill-yellow-400/20" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black text-white leading-none">
                                {stats.rating?.toFixed(1) ?? '—'}
                            </span>
                            <span className="text-sm font-bold text-slate-500">/ 5.0</span>
                        </div>
                        <div className="text-xs text-blue-200/70 font-black uppercase tracking-tight mt-1">
                            {stats.ratingCount} değerlendirme
                        </div>
                    </div>
                    <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                                key={s}
                                className={`w-4 h-4 ${s <= Math.round(stats.rating ?? 0) ? 'text-yellow-400 fill-yellow-500' : 'text-slate-700 fill-slate-700'}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Genel Toplam Kartı */}
                <div className="bg-[#0e1e3a] rounded-2xl border border-blue-900/40 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-green-950/20 border-b border-green-900/10">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="font-black italic uppercase tracking-tight text-green-600 text-sm">
                            Genel Toplam
                        </span>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-blue-900/40">
                        {/* Bugün */}
                        <div className="flex flex-col">
                            <div className="text-center py-2 bg-blue-950/30 border-b border-blue-900/30">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-100">Bugün</span>
                            </div>
                            <StatCell label="Maç" value={String(stats.totals.today.confirmedCount)} />
                            <div className="border-t border-blue-900/30">
                                <StatCell label="Kazanç" value={formatCurrency(stats.totals.today.earnings)} accent />
                            </div>
                            <div className="border-t border-blue-900/30">
                                <StatCell label="Manuel" value={String(stats.totals.today.manualFillCount)} sub="saha kapalı" />
                            </div>
                        </div>
                        {/* Bu Ay */}
                        <div className="flex flex-col">
                            <div className="text-center py-2 bg-blue-950/30 border-b border-blue-900/30">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-100">Bu Ay</span>
                            </div>
                            <StatCell label="Maç" value={String(stats.totals.thisMonth.confirmedCount)} />
                            <div className="border-t border-blue-900/30">
                                <StatCell label="Kazanç" value={formatCurrency(stats.totals.thisMonth.earnings)} accent />
                            </div>
                            <div className="border-t border-blue-900/30">
                                <StatCell label="Manuel" value={String(stats.totals.thisMonth.manualFillCount)} sub="saha kapalı" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Saha saha kırılım */}
                {stats.pitches.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            <div className="w-1 h-5 bg-blue-500 rounded-full" />
                            <span className="text-xs font-black uppercase tracking-widest text-blue-300/60">
                                Saha Kırılımı
                            </span>
                        </div>
                        {stats.pitches.map((pitch) => (
                            <PitchCard key={pitch.pitchId} pitch={pitch} />
                        ))}
                    </div>
                )}

                {/* Bilgi notu */}
                <div className="flex items-start gap-3 bg-blue-950/40 border border-blue-900/40 rounded-xl p-3">
                    <Lock className="w-4 h-4 text-blue-400/60 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-blue-300/50 leading-relaxed font-medium">
                        Kazanç hesabı; kesinleşmiş maçlar üzerinden yapılır. İptal edilen maçlar otomatik olarak düşülür.
                        Manuel kapatmalar (saha kapalı) gelir hesabına dahil edilmez.
                    </p>
                </div>

            </div>

            <BusinessNavbar />
        </div>
    );
};
