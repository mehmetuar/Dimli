import React, { useRef, useState, useCallback } from 'react';
import { Star, TrendingUp, RotateCw, Lock, Trophy, Calendar, RefreshCw } from 'lucide-react';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';
import { CorporateGridBackground } from '../../../components/UI/CorporateGridBackground';
import { useBusinessStats, PitchStats } from './hooks/useBusinessStats';

const formatCurrency = (amount: number): string => {
    return `₺${amount.toLocaleString('tr-TR')}`;
};

const StatMetric: React.FC<{ label: string; value: string; sub?: string; isCurrency?: boolean }> = ({
    label, value, sub, isCurrency
}) => (
    <div className="flex flex-col items-center justify-center py-3.5 px-1 min-w-0 relative">
        <span className="text-[clamp(9px,2.2vw,10px)] font-bold uppercase tracking-widest text-slate-300 mb-1.5 whitespace-nowrap">{label}</span>
        <span className={`text-[clamp(16px,4.5vw,22px)] font-black leading-none whitespace-nowrap ${isCurrency ? 'text-green-500 drop-shadow-sm' : 'text-white drop-shadow-sm'}`}>
            {value}
        </span>
        {sub && <span className="text-[clamp(8px,2vw,9px)] text-slate-400 mt-1 font-medium whitespace-nowrap">{sub}</span>}
    </div>
);

const PitchCard: React.FC<{ pitch: PitchStats }> = ({ pitch }) => (
    <div className="bg-slate-700/50 rounded-2xl border border-slate-600/50 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12)] mb-4">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-700/70 border-b border-slate-600/40">
            <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                <span className="font-black italic uppercase tracking-tight text-white text-[clamp(12px,3.5vw,15px)]">
                    {pitch.pitchName}
                </span>
            </div>
            <div className="flex items-center gap-0.5 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-600/50">
                <span className="text-[clamp(11px,3vw,13px)] font-black text-orange-400 drop-shadow-[0_0_5px_rgba(249,115,22,0.3)]">
                    {pitch.pricePerHour.toLocaleString('tr-TR')}
                </span>
                <span className="text-[clamp(11px,3vw,13px)] font-black text-orange-400">₺</span>
                <span className="text-[clamp(9px,2.5vw,10px)] font-bold text-slate-400">/sa</span>
            </div>
        </div>

        <div className="p-4 space-y-4">
            {/* Bugün */}
            <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[clamp(9px,2.5vw,11px)] font-black uppercase tracking-widest text-slate-300">Bugün</span>
                    <div className="flex-1 h-px bg-slate-700/50" />
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-700/60 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <StatMetric label="Maç" value={String(pitch.today.confirmedCount)} />
                    <StatMetric label="Manuel" value={String(pitch.today.manualFillCount)} sub="Kapalı" />
                    <StatMetric label="Kazanç" value={formatCurrency(pitch.today.earnings)} isCurrency />
                </div>
            </div>

            {/* Bu Ay */}
            <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[clamp(9px,2.5vw,11px)] font-black uppercase tracking-widest text-slate-300">Bu Ay</span>
                    <div className="flex-1 h-px bg-slate-700/50" />
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-700/60 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <StatMetric label="Maç" value={String(pitch.thisMonth.confirmedCount)} />
                    <StatMetric label="Manuel" value={String(pitch.thisMonth.manualFillCount)} sub="Kapalı" />
                    <StatMetric label="Kazanç" value={formatCurrency(pitch.thisMonth.earnings)} isCurrency />
                </div>
            </div>
        </div>
    </div>
);

const PULL_THRESHOLD = 70;

export const BusinessStats: React.FC = () => {
    const { stats, loading, error, refetch, silentRefetch } = useBusinessStats();

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
            try { await silentRefetch(); } finally { setIsRefreshing(false); }
        }
        setPullDistance(0);
    }, [pullDistance, silentRefetch]);

    if (loading) return <BusinessLoadingSpinner fullScreen />;

    if (error || !stats) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center gap-4 text-white pb-32">
                <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                    <TrendingUp className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-400 font-bold text-sm text-center">{error || 'Veri bulunamadı.'}</p>
                </div>
                <button
                    onClick={() => refetch()}
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
            className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col overflow-hidden"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >

            {/* Header */}
            <div
                className="relative shrink-0 px-4 pt-6 pb-5 border-b border-orange-500/10 overflow-hidden"
                style={{ background: 'radial-gradient(circle at top left, rgba(249,115,22,0.15) 0%, #0a1628 50%, #0f1e3a 100%)', boxShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
            >
                <CorporateGridBackground />
                <div className="relative z-10 flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Trophy className="w-4 h-4 text-orange-500 flex-shrink-0 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]" />
                            <span className="text-[clamp(9px,2.4vw,11px)] text-orange-500 font-black uppercase tracking-[0.2em] drop-shadow-sm">
                                Özet & İstatistik
                            </span>
                        </div>
                        <h1 className="font-sport font-black text-[clamp(18px,6vw,28px)] text-white italic tracking-tighter uppercase leading-tight break-words drop-shadow-md">
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
                <div className="bg-slate-700/50 backdrop-blur-md rounded-2xl border border-slate-600/50 p-4 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 relative"
                            style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.2) 0%, rgba(234,179,8,0.05) 100%)', border: '1px solid rgba(234,179,8,0.3)' }}>
                            <div className="absolute inset-0 rounded-2xl bg-yellow-400/10 blur-xl" />
                            <Star className="relative z-10 w-7 h-7 text-yellow-400 fill-yellow-400/40 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5 mb-1">
                                <span className="text-[clamp(28px,8vw,36px)] font-black text-white leading-none drop-shadow-sm">
                                    {stats.rating?.toFixed(1) ?? '—'}
                                </span>
                                <span className="text-[clamp(12px,3.5vw,14px)] font-bold text-slate-400">/ 5.0</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                            key={s}
                                            className={`w-3.5 h-3.5 ${s <= Math.round(stats.rating ?? 0) ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_4px_rgba(234,179,8,0.5)]' : 'text-slate-600/60 fill-slate-600/60'}`}
                                        />
                                    ))}
                                </div>
                                <span className="text-[clamp(10px,2.5vw,11px)] text-slate-300 font-medium">
                                    {stats.ratingCount} değerlendirme
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Genel Toplam Kartı */}
                <div className="bg-slate-700/50 backdrop-blur-md rounded-2xl border border-slate-600/50 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
                    <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-600/40"
                        style={{ background: 'linear-gradient(90deg, rgba(34,197,94,0.1) 0%, transparent 100%)' }}>
                        <div className="p-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                        </div>
                        <span className="font-black italic uppercase tracking-tight text-green-500 text-[clamp(12px,3.5vw,14px)]">
                            Genel Toplam
                        </span>
                    </div>
                    <div className="p-4 space-y-4">
                        {/* Bugün */}
                        <div>
                            <div className="flex items-center gap-2 mb-2 px-1">
                                <span className="text-[clamp(9px,2.5vw,11px)] font-black uppercase tracking-widest text-slate-300">Bugün</span>
                                <div className="flex-1 h-px bg-slate-700/50" />
                            </div>
                            <div className="grid grid-cols-3 divide-x divide-slate-700/60 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                <StatMetric label="Maç" value={String(stats.totals.today.confirmedCount)} />
                                <StatMetric label="Manuel" value={String(stats.totals.today.manualFillCount)} sub="Kapalı" />
                                <StatMetric label="Kazanç" value={formatCurrency(stats.totals.today.earnings)} isCurrency />
                            </div>
                        </div>

                        {/* Bu Ay */}
                        <div>
                            <div className="flex items-center gap-2 mb-2 px-1">
                                <span className="text-[clamp(9px,2.5vw,11px)] font-black uppercase tracking-widest text-slate-300">Bu Ay</span>
                                <div className="flex-1 h-px bg-slate-700/50" />
                            </div>
                            <div className="grid grid-cols-3 divide-x divide-slate-700/60 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                <StatMetric label="Maç" value={String(stats.totals.thisMonth.confirmedCount)} />
                                <StatMetric label="Manuel" value={String(stats.totals.thisMonth.manualFillCount)} sub="Kapalı" />
                                <StatMetric label="Kazanç" value={formatCurrency(stats.totals.thisMonth.earnings)} isCurrency />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Saha saha kırılım */}
                {stats.pitches.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1 pt-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-300" />
                            <span className="text-[clamp(9px,2.5vw,11px)] font-black uppercase tracking-widest text-slate-300">
                                Saha Kırılımı
                            </span>
                        </div>
                        {stats.pitches.map((pitch) => (
                            <PitchCard key={pitch.pitchId} pitch={pitch} />
                        ))}
                    </div>
                )}

                {/* Bilgi notu */}
                <div className="flex items-start gap-3 bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5">
                    <Lock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[clamp(10px,2.8vw,12px)] text-slate-300 leading-relaxed font-medium">
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
