import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Navigation, Phone, Star, Store, Trophy, TurkishLira, X } from 'lucide-react';
import { Business } from '../../../../types';
import { getBusinesses } from '../../../../services/api';
import { LoadingSpinner } from '../../../../components/UI/LoadingSpinner';
import { telHref } from '../../../../utils/phone';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';
import { DirectionsConfirmModal } from '../../PitchBooking/components/DirectionsConfirmModal';
import { DEMO_BUSINESS, isDemoId } from '../../PitchBooking/demo/demoTourData';
import { pitchTypeLabel } from '../../../../utils/pitchType';

interface BusinessInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessId: string | null;
    pitchId: string | null;
    distanceKm?: number;
}

// Maç Pazarı'nda seçilen sahanın işletme özeti. Takım detayı gibi merkezde
// açılır; işletmenin tam verisi sadece kullanıcı dokunduğunda alınır.
export const BusinessInfoModal: React.FC<BusinessInfoModalProps> = ({
    isOpen,
    onClose,
    businessId,
    pitchId,
    distanceKm,
}) => {
    const [business, setBusiness] = useState<Business | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);
    const [reloadToken, setReloadToken] = useState(0);
    const [showDirections, setShowDirections] = useState(false);

    useEffect(() => {
        if (!isOpen || !businessId) return;

        // Tanıtım turu demo işletmesi: sunucuya gidilmez — fikstür doğrudan basılır
        if (isDemoId(businessId)) {
            setBusiness(DEMO_BUSINESS);
            setIsLoading(false);
            setHasError(false);
            return;
        }

        let cancelled = false;
        setBusiness(null);
        setIsLoading(true);
        setHasError(false);
        setImageFailed(false);

        getBusinesses({ ids: [businessId] })
            .then((businesses) => {
                if (!cancelled) setBusiness(businesses[0] || null);
            })
            .catch((error) => {
                console.error('Failed to fetch marketplace business details', error);
                if (!cancelled) setHasError(true);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => { cancelled = true; };
    }, [isOpen, businessId, reloadToken]);

    useModalBodyClass(isOpen);

    const selectedPitch = useMemo(
        () => business?.pitches?.find((pitch) => pitch.id === pitchId) ?? null,
        [business, pitchId],
    );
    const facilities = selectedPitch?.facilities?.filter(Boolean) ?? [];
    const ratingCount = business?.ratingCount ?? 0;
    const rating = ratingCount > 0 ? business?.rating.toFixed(1) : '5.0';
    const phone = business?.ownerPhone || business?.phone || null;
    const canGetDirections = business?.latitude != null && business?.longitude != null;

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
            role="presentation"
            // Demo (tanıtım turu): panel, kompakt tur kartının (≤150px, TourOverlay
            // COMPACT_RESERVE=170) ÜSTÜNDEKİ alanda ortalanır — spotlight çerçevesi
            // panel kenarını sarar, içerikten asla geçmez
            style={isDemoId(businessId) ? { paddingBottom: 176 } : undefined}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-label="İşletme bilgileri"
                data-tour-id={isDemoId(businessId) ? 'market-business-modal' : undefined}
                className="bg-slate-800 w-full max-w-lg rounded-3xl border border-slate-700/50 overflow-hidden relative shadow-2xl flex flex-col max-h-[92vh] animate-slide-up"
                style={isDemoId(businessId) ? { maxHeight: 'calc(100vh - 208px)' } : undefined}
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    data-tour-id={isDemoId(businessId) ? 'market-business-close' : undefined}
                    onClick={onClose}
                    aria-label="İşletme bilgilerini kapat"
                    className="absolute top-3 right-3 min-w-11 min-h-11 bg-black/45 active:bg-black/65 rounded-full text-white transition-colors z-20 backdrop-blur-sm flex items-center justify-center"
                >
                    <X className="w-5 h-5" />
                </button>

                {isLoading ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-3">
                        <LoadingSpinner />
                        <span className="text-sm text-slate-400">İşletme bilgileri yükleniyor...</span>
                    </div>
                ) : hasError || !business ? (
                    <div className="px-6 py-16 text-center flex flex-col items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                            <Store className="w-7 h-7 text-slate-500" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold">İşletme bilgisi yüklenemedi</h2>
                            <p className="text-sm text-slate-400 mt-1">Bağlantınızı kontrol edip tekrar deneyin.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setReloadToken((token) => token + 1)}
                            className="bg-turf-600 active:bg-turf-500 text-white px-5 py-3 rounded-xl text-sm font-bold"
                        >
                            Tekrar Dene
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Demo: kapak küçültülür — kazanılan alanla TÜM imkan rozetleri
                            sabit buton şeridinin üstünde kaydırmasız görünür */}
                        <div className={`${isDemoId(businessId) ? 'h-28' : 'h-40'} relative bg-slate-900 shrink-0`}>
                            {!imageFailed && business.coverImageUrl ? (
                                <img
                                    src={business.coverImageUrl}
                                    alt={business.name}
                                    className="w-full h-full object-cover"
                                    onError={() => setImageFailed(true)}
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-turf-900 to-slate-900 flex items-center justify-center">
                                    <Store className="w-12 h-12 text-turf-500/70" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
                            <div className="absolute left-5 right-16 bottom-4 min-w-0">
                                <p className="text-[10px] font-black text-turf-400 uppercase tracking-widest mb-1">İşletme</p>
                                <h2 className="font-sport font-black text-xl text-white uppercase italic tracking-tight truncate">
                                    {business.name}
                                </h2>
                                {selectedPitch && (
                                    <div className="flex items-center gap-2 min-w-0">
                                        <p className="text-sm text-slate-200 font-semibold truncate">{selectedPitch.name}</p>
                                        {selectedPitch.type && (
                                            <span className="shrink-0 text-[10px] font-bold text-turf-300 bg-turf-600/20 border border-turf-500/40 px-1.5 py-px rounded">
                                                {pitchTypeLabel(selectedPitch.type)}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 px-5 pt-5 pb-4 overflow-y-auto">
                            <div className="flex items-center justify-between gap-3 mb-5">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 shrink-0" />
                                    <span className="text-sm font-black text-white">{rating}</span>
                                    <span className="text-xs text-slate-400">({ratingCount} değerlendirme)</span>
                                </div>
                                {distanceKm !== undefined && (
                                    <div className="shrink-0 flex items-center gap-1 bg-turf-600/20 border border-turf-500/40 px-2.5 py-1 rounded-full">
                                        <Navigation className="w-3 h-3 text-turf-400" />
                                        <span className="text-xs font-black text-white">{distanceKm} km</span>
                                    </div>
                                )}
                            </div>

                            {selectedPitch?.pricePerHour != null && (
                                <div className="bg-slate-900/60 rounded-2xl border border-slate-700/60 p-3.5 flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                                        <TurkishLira className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Saatlik Ücret</p>
                                        <p className="text-base font-black text-green-400 flex items-center gap-0.5">
                                            {selectedPitch.pricePerHour} <TurkishLira className="w-3.5 h-3.5" /> <span className="text-xs text-slate-400 font-semibold">/ saat</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-3 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                                    <MapPin className="w-5 h-5 text-sky-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Açık Adres</p>
                                    <p className="text-sm font-bold text-white">{business.district}{business.city && business.city !== business.district ? `, ${business.city}` : ''}</p>
                                    {business.address && <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{business.address}</p>}
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Trophy className="w-3.5 h-3.5 text-yellow-500" /> Saha İmkanları
                                </p>
                                {facilities.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {facilities.map((facility) => (
                                            <span key={facility} className="px-3 py-1.5 rounded-lg bg-slate-700/70 border border-slate-600/70 text-xs font-semibold text-slate-200">
                                                {facility}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500">Bu saha için imkan bilgisi bulunmuyor.</p>
                                )}
                            </div>
                        </div>

                        <div
                            className={`${isDemoId(businessId) ? 'p-3' : 'p-4'} bg-slate-900 border-t border-slate-700 shrink-0`}
                            // Demo'da panel ekran dibinde DEĞİL (v17 sığdırması) — safe-area
                            // eklemesi gereksiz yer yiyordu
                            style={{ paddingBottom: isDemoId(businessId) ? 12 : 'max(16px, var(--safe-bottom))' }}
                        >
                            <div className="flex gap-3">
                                {phone ? (
                                    <a
                                        href={telHref(phone)}
                                        className="flex-1 bg-turf-600 active:bg-turf-500 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-turf-600/20 active:scale-[0.98] transition-transform"
                                    >
                                        <Phone className="w-4 h-4" /> İşletmeyi Ara
                                    </a>
                                ) : (
                                    <div className="flex-1 bg-slate-700/60 text-slate-500 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-slate-600/50">
                                        <Phone className="w-4 h-4" /> Telefon bilgisi bulunmuyor
                                    </div>
                                )}
                                {canGetDirections && (
                                    <button
                                        type="button"
                                        onClick={() => setShowDirections(true)}
                                        className="flex-1 bg-slate-800 active:bg-slate-700 border border-slate-700 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                                    >
                                        <Navigation className="w-4 h-4 text-turf-400" /> Yol Tarifi Al
                                    </button>
                                )}
                            </div>
                        </div>
                        <DirectionsConfirmModal
                            isOpen={showDirections}
                            onClose={() => setShowDirections(false)}
                            businessName={business.name}
                            latitude={business.latitude}
                            longitude={business.longitude}
                        />
                    </>
                )}
            </section>
        </div>,
        document.body,
    );
};
