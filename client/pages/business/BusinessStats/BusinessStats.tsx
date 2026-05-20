import React, { useRef, useState, useCallback } from 'react';
import { Star, TrendingUp, RotateCw, Lock, Trophy, Calendar, RefreshCw } from 'lucide-react';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';
import { useBusinessStats, PitchStats } from './hooks/useBusinessStats';

const formatCurrency = (amount: number): string => {
    return `₺${amount.toLocaleString('tr-TR')}`;
};

const StatCell: React.FC<{ label: string; value: string; sub?: string; accent?: boolean }> = ({
    label, value, sub, accent
}) => (
    <div className="flex flex-col items-center justify-center py-4 px-2 min-w-0">
        <span className="text-[clamp(9px,2.4vw,11px)] font-bold uppercase tracking-widest text-slate-400 mb-1.5 whitespace-nowrap">{label}</span>
        <span className={`text-[clamp(16px,4.5vw,22px)] font-black leading-none whitespace-nowrap ${accent ? 'text-green-400' : 'text-white'}`}>
            {value}
        </span>
        {sub && <span className="text-[clamp(9px,2.2vw,10px)] text-slate-500 mt-1 font-medium whitespace-nowrap">{sub}</span>}
    </div>
);

const PitchCard: React.FC<{ pitch: PitchStats }> = ({ pitch }) => (
    <div className="bg-slate-800/70 rounded-2xl border border-slate-700/60 overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-4 py-3.5 bg-slate-900/60 border-b border-slate-700/50">
            <div className="flex items-center gap-2.5">
                <div className="w-1 h-6 bg-orange-500 rounded-full" />
                <span className="font-black italic uppercase tracking-tight text-white text-[clamp(12px,3.5vw,15px)]">
                    {pitch.pitchName}
                </span>
            </div>
            <div className="flex items-center gap-0.5">
                <span className="text-[clamp(11px,3vw,13px)] font-black text-white">
                    {pitch.pricePerHour.toLocaleString('tr-TR')}
                </span>
                <span className="text-[clamp(11px,3vw,13px)] font-black text-white">₺</span>
                <span className="text-[clamp(10px,2.8vw,11px)] font-medium text-slate-300">/sa</span>
            </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-700/50">
            <div className="flex flex-col">
                <div className="text-center py-2.5 bg-slate-900/30 border-b border-slate-700/40">
                    <span className="text-[clamp(9px,2.5vw,11px)] font-black uppercase tracking-widest text-slate-300">
                        Bugün
                    </span>
                </div>
                <StatCell label="Maç" value={String(pitch.today.confirmedCount)} />
                <div className="border-t border-slate-700/40 bg-green-950/10">
                    <StatCell label="Kazanç" value={formatCurrency(pitch.today.earnings)} accent />
                </div>
                <div className="border-t border-slate-700/40">
                    <StatCell label="Manuel" value={String(pitch.today.manualFillCount)} sub="saha kapalı" />
                </div>
            </div>

            <div className="flex flex-col">
                <div className="text-center py-2.5 bg-slate-900/30 border-b border-slate-700/40">
                    <span className="text-[clamp(9px,2.5vw,11px)] font-black uppercase tracking-widest text-slate-300">
                        Bu Ay
                    </span>
                </div>
                <StatCell label="Maç" value={String(pitch.thisMonth.confirmedCount)} />
                <div className="border-t border-slate-700/40 bg-green-950/10">
                    <StatCell label="Kazanç" value={formatCurrency(pitch.thisMonth.earnings)} accent />
                </div>
                <div className="border-t border-slate-700/40">
                    <StatCell label="Manuel" value={String(pitch.thisMonth.manualFillCount)} sub="saha kapalı" />
                </div>
            </div>
        </div>
    </div>
);

const PULL_THRESHOLD = 70;

export const BusinessStats: React.FC = () => {
    const { stats, loading, error, refetch } = useBusinessStats();

    const scrollRef = useRef<HTMLDivElement>(null);
    const touchStartYRef = useRef(0);
    const touchStartScrollRef = useRef(0);
    const triggeredRef = useRef(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        touchStartYRef.current = e.touches[0].clientY;
        touchStartScrollRef.current = scrollRef.current?.scrollTop ?? 0;
        triggeredRef.current = false;
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (isRefreshing || touchStartScrollRef.current > 4) return;
        const delta = e.touches[0].clientY - touchStartYRef.current;
        if (delta > 0) setPullDistance(Math.min(delta * 0.45, 90));
        else setPullDistance(0);
    }, [isRefreshing]);

    const onTouchEnd = useCallback(async () => {
        if (pullDistance >= PULL_THRESHOLD && !triggeredRef.current) {
            triggeredRef.current = true;
            setIsRefreshing(true);
            try { await refetch(); } finally { setIsRefreshing(false); }
        }
        setPullDistance(0);
    }, [pullDistance, refetch]);

    if (loading) return <BusinessLoadingSpinner fullScreen />;

    if (error || !stats) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center gap-4 text-white pb-32">
                <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                    <TrendingUp className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-400 font-bold text-sm text-center">{error || 'Veri bulunamadı.'}</p>
                </div>
                <button
                    onClick={refetch}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-500 rounded-xl font-black uppercase italic text-sm shadow-lg shadow-orange-500/20 active:scale-95 transition-transform"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    <RotateCw className="w-4 h-4" /> Tekrar Dene
                </button>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white flex flex-col overflow-hidden"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >

            {/* Header */}
            <div
                className="shrink-0 px-4 pt-4 pb-4 border-b border-slate-700/60"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
            >
                <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Trophy className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            <span className="text-[clamp(9px,2.4vw,11px)] text-orange-500/80 font-black uppercase tracking-[0.2em]">
                                Özet & İstatistik
                            </span>
                        </div>
                        <h1 className="font-sport font-black text-[clamp(16px,5vw,26px)] text-white italic tracking-tighter uppercase leading-tight break-words">
                            {stats.businessName}
                        </h1>
                    </div>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
            {/* Pull-to-refresh — turuncu */}
            <div
                className="flex items-center justify-center overflow-hidden"
                style={{ height: isRefreshing ? 56 : pullDistance, transition: isRefreshing ? 'none' : 'height 0.2s ease' }}
            >
                {(pullDistance > 0 || isRefreshing) && (
                    <RefreshCw
                        className={`w-5 h-5 text-orange-400 ${isRefreshing ? 'animate-spin' : ''}`}
                        style={isRefreshing ? undefined : { transform: `rotate(${Math.min(pullDistance * 3, 360)}deg)` }}
                    />
                )}
            </div>
            <div className="p-4 space-y-4 pb-business-nav">

                {/* Değerlendirme Kartı */}
                <div className="bg-slate-800/70 rounded-2xl border border-slate-700/60 p-4 overflow-hidden shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.15) 0%, rgba(234,179,8,0.05) 100%)', border: '1px solid rgba(234,179,8,0.25)' }}>
                            <Star className="w-7 h-7 text-yellow-400 fill-yellow-400/30" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5 mb-1">
                                <span className="text-[clamp(26px,8vw,34px)] font-black text-white leading-none">
                                    {stats.rating?.toFixed(1) ?? '—'}
                                </span>
                                <span className="text-sm font-bold text-slate-500">/ 5.0</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                            key={s}
                                            className={`w-4 h-4 ${s <= Math.round(stats.rating ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700 fill-slate-700'}`}
                                        />
                                    ))}
                                </div>
                                <span className="text-[clamp(9px,2.5vw,11px)] text-slate-400 font-semibold">
                                    {stats.ratingCount} değerlendirme
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Genel Toplam Kartı */}
                <div className="bg-slate-800/70 rounded-2xl border border-slate-700/60 overflow-hidden shadow-lg">
                    <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-700/50"
                        style={{ background: 'linear-gradient(90deg, rgba(34,197,94,0.08) 0%, transparent 100%)' }}>
                        <div className="p-1.5 bg-green-500/15 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                        </div>
                        <span className="font-black italic uppercase tracking-tight text-green-400 text-[clamp(12px,3.5vw,14px)]">
                            Genel Toplam
                        </span>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-slate-700/50">
                        <div className="flex flex-col">
                            <div className="text-center py-2.5 bg-slate-900/30 border-b border-slate-700/40">
                                <span className="text-[clamp(9px,2.5vw,11px)] font-black uppercase tracking-widest text-slate-300">Bugün</span>
                            </div>
                            <StatCell label="Maç" value={String(stats.totals.today.confirmedCount)} />
                            <div className="border-t border-slate-700/40 bg-green-950/10">
                                <StatCell label="Kazanç" value={formatCurrency(stats.totals.today.earnings)} accent />
                            </div>
                            <div className="border-t border-slate-700/40">
                                <StatCell label="Manuel" value={String(stats.totals.today.manualFillCount)} sub="saha kapalı" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <div className="text-center py-2.5 bg-slate-900/30 border-b border-slate-700/40">
                                <span className="text-[clamp(9px,2.5vw,11px)] font-black uppercase tracking-widest text-slate-300">Bu Ay</span>
                            </div>
                            <StatCell label="Maç" value={String(stats.totals.thisMonth.confirmedCount)} />
                            <div className="border-t border-slate-700/40 bg-green-950/10">
                                <StatCell label="Kazanç" value={formatCurrency(stats.totals.thisMonth.earnings)} accent />
                            </div>
                            <div className="border-t border-slate-700/40">
                                <StatCell label="Manuel" value={String(stats.totals.thisMonth.manualFillCount)} sub="saha kapalı" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Saha saha kırılım */}
                {stats.pitches.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1 pt-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[clamp(9px,2.5vw,11px)] font-black uppercase tracking-widest text-slate-400">
                                Saha Kırılımı
                            </span>
                        </div>
                        {stats.pitches.map((pitch) => (
                            <PitchCard key={pitch.pitchId} pitch={pitch} />
                        ))}
                    </div>
                )}

                {/* Bilgi notu */}
                <div className="flex items-start gap-3 bg-slate-800/40 border border-slate-700/40 rounded-xl p-3.5">
                    <Lock className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[clamp(10px,2.8vw,12px)] text-slate-400 leading-relaxed font-medium">
                        Kazanç hesabı kesinleşmiş maçlar üzerinden yapılır. İptal edilen maçlar otomatik düşülür.
                        Manuel kapatmalar gelir hesabına dahil edilmez.
                    </p>
                </div>

            </div>
            </div>

            <BusinessNavbar />
        </div>
    );
};
