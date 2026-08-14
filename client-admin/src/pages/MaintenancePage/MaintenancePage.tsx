import React, { useState } from 'react';
import { IconImage, IconTrash, IconSearch, IconAlertCircle, IconCheck } from '../../components/Icons';
import { useMaintenancePage } from './hooks/useMaintenancePage';

function formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const MaintenancePage: React.FC = () => {
    const {
        orphans, summary, selected, scanning, deleting,
        error, notice, hasScanned, isSuperadmin,
        scan, toggle, toggleAll, cleanup,
    } = useMaintenancePage();

    const [confirmOpen, setConfirmOpen] = useState(false);

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Başlık */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-orange-400">
                    <IconImage size={18} />
                </div>
                <div>
                    <h1 className="text-xl font-black text-[#dde8f5]">Görsel Temizliği</h1>
                    <p className="text-[#7b9ab8] text-xs">
                        Cloudinary'de hiçbir kayda bağlı olmayan (yetim) görselleri tara ve temizle
                    </p>
                </div>
            </div>

            <p className="text-slate-500 text-xs mb-5 leading-relaxed">
                Yetimler çoğunlukla yarım kalan/başarısız işletme kayıtlarından artakalır. Tarama yalnız
                <span className="text-[#7b9ab8] font-semibold"> 24 saatten eski</span> görselleri hedefler
                (devam eden kayıtları vurmamak için) ve arşivdeki (silinmiş) işletmelerin görsellerini korur.
            </p>

            {/* Aksiyonlar */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
                <button
                    onClick={scan}
                    disabled={scanning}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#1e2d47] border border-slate-700/40 text-[#dde8f5] hover:bg-[#243458] hover:border-slate-500/60 transition-all disabled:opacity-50"
                >
                    <IconSearch size={16} />
                    {scanning ? 'Taranıyor…' : 'Yetim görselleri tara'}
                </button>

                {hasScanned && orphans.length > 0 && isSuperadmin && (
                    <button
                        onClick={() => setConfirmOpen(true)}
                        disabled={deleting || selected.size === 0}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all disabled:opacity-40"
                    >
                        <IconTrash size={16} />
                        Seçilenleri sil ({selected.size})
                    </button>
                )}
            </div>

            {/* Bildirimler */}
            {error && (
                <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                    <IconAlertCircle size={16} className="shrink-0" />
                    {error}
                </div>
            )}
            {notice && (
                <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
                    <IconCheck size={16} className="shrink-0" />
                    {notice}
                </div>
            )}

            {/* Özet */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <StatCard label="Yetim görsel" value={summary.orphanCount} accent="text-orange-300" />
                    <StatCard label="Taranan" value={summary.scanned} />
                    <StatCard label="Referanslı" value={summary.referenced} />
                    <StatCard label="Kurtarılacak alan" value={formatBytes(summary.totalBytes)} />
                </div>
            )}

            {/* Liste */}
            {!hasScanned ? (
                <div className="text-center py-24 text-[#7b9ab8]">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-orange-400">
                        <IconImage size={28} className="opacity-40" />
                    </div>
                    <p className="font-bold text-[#dde8f5]">Henüz tarama yapılmadı</p>
                    <p className="text-xs mt-1">Başlamak için "Yetim görselleri tara" butonuna bas</p>
                </div>
            ) : orphans.length === 0 ? (
                <div className="text-center py-24 text-[#7b9ab8]">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 text-emerald-400">
                        <IconCheck size={28} />
                    </div>
                    <p className="font-bold text-[#dde8f5]">Temiz!</p>
                    <p className="text-xs mt-1">Silinecek yetim görsel bulunamadı</p>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={toggleAll}
                            className="text-xs font-bold text-[#7b9ab8] hover:text-[#dde8f5] transition-colors"
                        >
                            {selected.size === orphans.length ? 'Seçimi kaldır' : 'Tümünü seç'}
                        </button>
                        {!isSuperadmin && (
                            <span className="text-xs text-slate-500 italic">Silme için süper admin yetkisi gerekli</span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {orphans.map((o) => {
                            const isSel = selected.has(o.publicId);
                            return (
                                <div
                                    key={o.publicId}
                                    onClick={() => isSuperadmin && toggle(o.publicId)}
                                    className={`relative rounded-2xl overflow-hidden border transition-all ${
                                        isSuperadmin ? 'cursor-pointer' : ''
                                    } ${
                                        isSel
                                            ? 'border-orange-400/70 ring-2 ring-orange-400/30'
                                            : 'border-slate-700/40 hover:border-slate-500/60'
                                    }`}
                                >
                                    <div className="aspect-square bg-[#0f1827]">
                                        <img
                                            src={o.url}
                                            alt={o.publicId}
                                            loading="lazy"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    {isSuperadmin && (
                                        <div
                                            className={`absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center border ${
                                                isSel
                                                    ? 'bg-orange-400 border-orange-400 text-[#0f1827]'
                                                    : 'bg-black/40 border-white/40'
                                            }`}
                                        >
                                            {isSel && <IconCheck size={12} />}
                                        </div>
                                    )}
                                    <div className="p-2 bg-[#1e2d47]">
                                        <p className="text-[10px] text-slate-500">
                                            {new Date(o.createdAt).toLocaleDateString('tr-TR')}
                                        </p>
                                        <p className="text-[10px] text-[#7b9ab8]">{formatBytes(o.bytes)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Onay modalı */}
            {confirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-[#1e2d47] border border-slate-700/40 rounded-2xl p-6 max-w-sm w-full">
                        <div className="flex items-center gap-2 mb-3 text-red-300">
                            <IconAlertCircle size={20} />
                            <h3 className="font-black text-lg">Görselleri sil?</h3>
                        </div>
                        <p className="text-sm text-[#7b9ab8] mb-5">
                            <span className="font-bold text-[#dde8f5]">{selected.size}</span> yetim görsel
                            Cloudinary'den <span className="text-red-300 font-semibold">kalıcı olarak</span> silinecek.
                            Bu işlem geri alınamaz.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmOpen(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-white/5 border border-slate-700/40 text-[#dde8f5] hover:bg-white/10 transition-all"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={async () => {
                                    setConfirmOpen(false);
                                    await cleanup();
                                }}
                                disabled={deleting}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all disabled:opacity-50"
                            >
                                {deleting ? 'Siliniyor…' : 'Evet, sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard: React.FC<{ label: string; value: React.ReactNode; accent?: string }> = ({
    label,
    value,
    accent,
}) => (
    <div className="bg-[#1e2d47] border border-slate-700/40 rounded-2xl p-4">
        <p className="text-[#7b9ab8] text-[11px] font-bold uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-2xl font-black ${accent ?? 'text-[#dde8f5]'}`}>{value}</p>
    </div>
);

export default MaintenancePage;
