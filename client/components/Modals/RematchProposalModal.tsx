
import React, { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Clock, ChevronRight, ChevronLeft, CheckCircle, Store, Send, Trophy, Loader2 } from 'lucide-react';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { Business, Pitch, ReservationStatus } from '../../types';
import api, { getReservationsByPitch } from '../../services/api';
import { DateSelectionModal } from './DateSelectionModal';
import { TimeSelectionModal } from './TimeSelectionModal';
import { useLocationContext } from '../../contexts/LocationContext';
import { useModalBodyClass } from '../../utils/useModalBodyClass';
import { LocationAccessGate } from '../LocationAccessGate';

interface RematchProposalModalProps {
    isOpen: boolean;
    onClose: () => void;
    channelId: string;
    matchType: 'played' | 'unplayed';
    previousPitchId?: string;
    previousPlayerCount?: number;
}

export const RematchProposalModal: React.FC<RematchProposalModalProps> = (props) => {
    useModalBodyClass(props.isOpen);
    if (!props.isOpen) return null;
    return <RematchProposalModalContent {...props} />;
};

const RematchProposalModalContent: React.FC<RematchProposalModalProps> = ({
    isOpen,
    onClose,
    channelId,
    matchType,
    previousPitchId,
    previousPlayerCount,
}) => {
    const { coords, radius } = useLocationContext();

    // Wizard step: 1=İşletme, 2=Saha, 3=Tarih, 4=Saat, 5=Özet
    const [step, setStep] = useState(1);

    // Data
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [isFetchingData, setIsFetchingData] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Selections
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
    const [selectedPitchId, setSelectedPitchId] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [playerCount, setPlayerCount] = useState(previousPlayerCount || 7);

    // Booked slots
    const [bookedTimes, setBookedTimes] = useState<string[]>([]);

    // Sub-modals
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);

    // Region filter
    const [selectedRegion, setSelectedRegion] = useState('TÜMÜ');

    // Fetch businesses
    useEffect(() => {
        const fetchData = async () => {
            if (!coords) return;
            setIsFetchingData(true);
            try {
                const res = await api.get('/businesses', { params: { lat: coords.lat, lng: coords.lng, radius } });
                const fetched: Business[] = res.data;
                setBusinesses(fetched);

                // Pre-select previous pitch's business if available
                if (previousPitchId) {
                    const business = fetched.find(b => b.pitches?.some(p => p.id === previousPitchId));
                    if (business) {
                        setSelectedBusinessId(business.id);
                        setSelectedPitchId(previousPitchId);
                        setStep(3); // Jump to date selection
                    }
                }
            } catch (error) {
                console.error('Failed to fetch businesses:', error);
                setErrorMessage('İşletmeler yüklenirken hata oluştu.');
            } finally {
                setIsFetchingData(false);
            }
        };

        if (isOpen) {
            fetchData();
            // Reset state
            if (!previousPitchId) {
                setStep(1);
                setSelectedBusinessId(null);
                setSelectedPitchId('');
                setDate('');
                setTime('');
                setSuccessMessage('');
                setErrorMessage('');
            }
        }
    }, [isOpen, coords]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch booked slots when pitch/date changes
    useEffect(() => {
        const fetchBooked = async () => {
            if (!selectedPitchId || !date) return;
            try {
                const reservations = await getReservationsByPitch(selectedPitchId, date);
                const approved = reservations.filter((r: any) => r.status === ReservationStatus.APPROVED);
                const times = approved.map((r: any) => {
                    const d = new Date(r.slotTime);
                    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false });
                });
                setBookedTimes(times);
            } catch (error) {
                console.error('Failed to fetch booked slots:', error);
            }
        };
        fetchBooked();
    }, [selectedPitchId, date]);

    // Helpers
    const selectedBusiness = businesses.find(b => b.id === selectedBusinessId);
    const selectedPitch = (() => {
        for (const b of businesses) {
            const p = b.pitches?.find(pitch => pitch.id === selectedPitchId);
            if (p) return p;
        }
        return null;
    })();

    const regions = ['TÜMÜ', ...new Set(businesses.map(b => b.district || b.city || ''))].filter(Boolean);
    const filteredBusinesses = selectedRegion === 'TÜMÜ'
        ? businesses
        : businesses.filter(b => (b.district === selectedRegion || b.city === selectedRegion));

    const handleBusinessSelect = (businessId: string) => {
        setSelectedBusinessId(businessId);
        setSelectedPitchId('');
        setTime('');
        setStep(2);
    };

    const handlePitchSelect = (pitchId: string) => {
        setSelectedPitchId(pitchId);
        setTime('');
        setStep(3);
    };

    const handleDateSelect = (selectedDate: string) => {
        setDate(selectedDate);
        setIsDateModalOpen(false);
        setTime('');
        setStep(4);
    };

    const handleTimeSelect = (selectedTime: string) => {
        setTime(selectedTime);
        setIsTimeModalOpen(false);
        setStep(5);
    };

    const handleSubmit = async () => {
        if (!selectedPitchId || !date || !time) {
            setErrorMessage('Lütfen tüm alanları doldurun.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        try {
            await api.post(`/chat/channels/${channelId}/rematch-proposal`, {
                pitchId: selectedPitchId,
                date,
                time,
                playerCount,
            });
            setSuccessMessage('Maç teklifi başarıyla gönderildi!');
            setTimeout(() => {
                onClose();
                window.location.reload();
            }, 1500);
        } catch (error: any) {
            console.error('Failed to create rematch proposal:', error);
            setErrorMessage(error.response?.data?.message || 'Teklif gönderilirken bir hata oluştu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const stepTitles = ['İşletme Seç', 'Saha Seç', 'Tarih Seç', 'Saat Seç', 'Özet & Gönder'];

    return (
        <>
            <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/90 backdrop-blur-sm animate-fade-in">
                <div className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl shadow-turf-500/10 overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">

                    {/* Header */}
                    <div className="p-5 border-b border-slate-700 bg-slate-900 sticky top-0 z-10">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                                {step > 1 && (
                                    <button
                                        onClick={() => setStep(step - 1)}
                                        className="p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                )}
                                <div>
                                    <h2 className="font-sport font-black text-xl text-white italic uppercase tracking-wide">
                                        {matchType === 'played' ? 'RÖVANŞ' : 'YENİ MAÇ'} <span className="text-turf-500">TEKLİFİ</span>
                                    </h2>
                                    <p className="text-slate-400 text-[10px]">{stepTitles[step - 1]}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Progress Dots */}
                        <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map(s => (
                                <div
                                    key={s}
                                    className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-turf-500' : 'bg-slate-700'}`}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="p-5 overflow-y-auto flex-1">
                        {/* Messages */}
                        {successMessage && (
                            <div className="mb-4 bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in">
                                <CheckCircle className="w-5 h-5" />
                                <p className="font-bold text-sm">{successMessage}</p>
                            </div>
                        )}
                        {errorMessage && (
                            <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in">
                                <X className="w-5 h-5" />
                                <p className="font-bold text-sm">{errorMessage}</p>
                            </div>
                        )}

                        {isFetchingData ? (
                            <div className="flex justify-center py-10"><LoadingSpinner /></div>
                        ) : (
                            <>
                                {/* STEP 1: İşletme Seç */}
                                {step === 1 && (
                                    <LocationAccessGate contentLabel="işletmeleri" compact>
                                        <div className="animate-fade-in">
                                            {/* Region Filter */}
                                            <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-2">
                                                {regions.map(region => (
                                                    <button
                                                        key={region}
                                                        onClick={() => setSelectedRegion(region)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${selectedRegion === region
                                                            ? 'bg-turf-600 text-white'
                                                            : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-turf-500'
                                                            }`}
                                                    >
                                                        {region}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                                                {filteredBusinesses.map(business => (
                                                    <div
                                                        key={business.id}
                                                        onClick={() => handleBusinessSelect(business.id)}
                                                        className={`rounded-xl border p-3 cursor-pointer flex items-center gap-3 hover:bg-slate-800 transition-all ${selectedBusinessId === business.id ? 'border-turf-500 bg-slate-900' : 'border-slate-700 bg-slate-900/50'}`}
                                                    >
                                                        <Store className={`w-5 h-5 ${selectedBusinessId === business.id ? 'text-turf-500' : 'text-slate-500'}`} />
                                                        <div className="flex-1">
                                                            <div className="font-bold text-white text-sm">{business.name}</div>
                                                            <div className="text-xs text-slate-500">{business.district}, {business.city}</div>
                                                        </div>
                                                        <div className="text-xs text-slate-500">{business.pitches?.length || 0} saha</div>
                                                        <ChevronRight className="w-4 h-4 text-slate-600" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </LocationAccessGate>
                                )}

                                {/* STEP 2: Saha Seç */}
                                {step === 2 && selectedBusiness && (
                                    <div className="animate-fade-in">
                                        <div className="mb-4 p-3 bg-slate-900 rounded-xl border border-slate-700 flex items-center gap-3">
                                            <Store className="w-5 h-5 text-turf-500" />
                                            <div>
                                                <div className="font-bold text-white text-sm">{selectedBusiness.name}</div>
                                                <div className="text-xs text-slate-500">{selectedBusiness.district}, {selectedBusiness.city}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2">
                                            {selectedBusiness.pitches?.map(pitch => (
                                                <div
                                                    key={pitch.id}
                                                    onClick={() => handlePitchSelect(pitch.id)}
                                                    className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all hover:bg-slate-800 ${selectedPitchId === pitch.id ? 'border-turf-500 bg-turf-900/20' : 'border-slate-700 bg-slate-900/50'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <MapPin className={`w-5 h-5 ${selectedPitchId === pitch.id ? 'text-turf-400' : 'text-slate-500'}`} />
                                                        <div>
                                                            <div className="font-bold text-white text-sm">{pitch.name}</div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] uppercase text-slate-400">{pitch.type}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-turf-400 font-bold text-base font-sport">₺{pitch.pricePerHour}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3: Tarih Seç */}
                                {step === 3 && (
                                    <div className="animate-fade-in">
                                        <div className="mb-4 p-3 bg-slate-900 rounded-xl border border-slate-700 flex items-center gap-3">
                                            <MapPin className="w-5 h-5 text-turf-500" />
                                            <div>
                                                <div className="font-bold text-white text-sm">{selectedBusiness?.name}</div>
                                                <div className="text-xs text-slate-400">{selectedPitch?.name}</div>
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => setIsDateModalOpen(true)}
                                            className="bg-slate-900 border border-slate-700 rounded-xl flex items-center gap-3 px-4 py-4 cursor-pointer hover:border-turf-500 transition-colors"
                                        >
                                            <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                <Calendar className="w-5 h-5 text-turf-400" />
                                            </div>
                                            <div className="flex-1 flex flex-col">
                                                <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">TARİH</div>
                                                <div className="text-white text-sm font-semibold">
                                                    {date
                                                        ? new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })
                                                        : 'Tarih Seçin'}
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-600" />
                                        </div>

                                        {/* Player Count Selector */}
                                        <div className="mt-5">
                                            <span className="text-xs text-slate-400 mb-2 block">Kadro Boyutu</span>
                                            <div className="flex p-1 bg-slate-900 rounded-lg overflow-x-auto">
                                                {[5, 6, 7, 8, 11].map((count) => (
                                                    <button
                                                        key={count}
                                                        onClick={() => setPlayerCount(count)}
                                                        className={`flex-1 py-2 px-2 text-xs font-bold rounded transition-colors whitespace-nowrap ${playerCount === count ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                                    >
                                                        {count}v{count}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 4: Saat Seç */}
                                {step === 4 && (
                                    <div className="animate-fade-in">
                                        <div className="mb-4 p-3 bg-slate-900 rounded-xl border border-slate-700 flex items-center gap-3">
                                            <Calendar className="w-5 h-5 text-turf-500" />
                                            <div>
                                                <div className="font-bold text-white text-sm">
                                                    {date && new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
                                                </div>
                                                <div className="text-xs text-slate-400">{selectedBusiness?.name} · {selectedPitch?.name}</div>
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => setIsTimeModalOpen(true)}
                                            className="bg-slate-900 border border-slate-700 rounded-xl flex items-center gap-3 px-4 py-4 cursor-pointer hover:border-turf-500 transition-colors"
                                        >
                                            <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                <Clock className="w-5 h-5 text-turf-400" />
                                            </div>
                                            <div className="flex-1 flex flex-col">
                                                <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">SAAT</div>
                                                <div className="text-white text-sm font-semibold">
                                                    {time ? time : 'Saat Seçin'}
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-600" />
                                        </div>

                                        {bookedTimes.length > 0 && (
                                            <div className="mt-3 text-xs text-amber-400 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                                <Clock className="w-4 h-4" />
                                                <span>{bookedTimes.length} saat dolu</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* STEP 5: Özet & Gönder */}
                                {step === 5 && (
                                    <div className="animate-fade-in">
                                        <div className="space-y-3">
                                            {/* İşletme */}
                                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                    <Store className="w-5 h-5 text-turf-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase">İŞLETME</div>
                                                    <div className="text-white font-bold text-sm">{selectedBusiness?.name}</div>
                                                </div>
                                                <button onClick={() => setStep(1)} className="text-[10px] text-turf-400 font-bold hover:underline">Değiştir</button>
                                            </div>

                                            {/* Saha */}
                                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                    <MapPin className="w-5 h-5 text-turf-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase">SAHA</div>
                                                    <div className="text-white font-bold text-sm">{selectedPitch?.name}</div>
                                                    <div className="text-xs text-turf-400 font-sport">₺{selectedPitch?.pricePerHour}</div>
                                                </div>
                                                <button onClick={() => setStep(2)} className="text-[10px] text-turf-400 font-bold hover:underline">Değiştir</button>
                                            </div>

                                            {/* Tarih */}
                                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                    <Calendar className="w-5 h-5 text-turf-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase">TARİH</div>
                                                    <div className="text-white font-bold text-sm">
                                                        {date && new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
                                                    </div>
                                                </div>
                                                <button onClick={() => setStep(3)} className="text-[10px] text-turf-400 font-bold hover:underline">Değiştir</button>
                                            </div>

                                            {/* Saat */}
                                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                    <Clock className="w-5 h-5 text-turf-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase">SAAT</div>
                                                    <div className="text-white font-bold text-sm">{time}</div>
                                                </div>
                                                <button onClick={() => setStep(4)} className="text-[10px] text-turf-400 font-bold hover:underline">Değiştir</button>
                                            </div>

                                            {/* Kadro */}
                                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                    <Trophy className="w-5 h-5 text-turf-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase">KADRO</div>
                                                    <div className="text-white font-bold text-sm">{playerCount}v{playerCount}</div>
                                                </div>
                                                <button onClick={() => setStep(3)} className="text-[10px] text-turf-400 font-bold hover:underline">Değiştir</button>
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting}
                                            className="w-full mt-6 bg-turf-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black uppercase italic py-4 rounded-xl text-lg shadow-lg shadow-turf-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Send className="w-5 h-5" />
                                                    Teklif Gönder
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <DateSelectionModal
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                onSelect={handleDateSelect}
                selectedDate={date}
            />

            <TimeSelectionModal
                isOpen={isTimeModalOpen}
                onClose={() => setIsTimeModalOpen(false)}
                onSelect={handleTimeSelect}
                selectedTime={time}
                business={selectedBusiness}
                pitch={selectedPitch}
                selectedDate={date}
                bookedHours={bookedTimes}
            />
        </>
    );
};
