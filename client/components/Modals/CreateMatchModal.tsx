
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Calendar, Clock, Shield, ChevronRight, CheckCircle, Trophy, Store, Info, Search } from 'lucide-react';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { SkillLevel, Business, ReservationStatus } from '../../types';
import api, { getReservationsByPitch, getBusinesses } from '../../services/api';
import { useLocationContext } from '../../contexts/LocationContext';
import { useKeyboardHeight } from '../../utils/useKeyboardHeight';
import { getSlotRealDateTime, isNightHour } from '../../utils/nightSlot';

import { DateSelectionModal } from './DateSelectionModal';
import { TimeSelectionModal } from './TimeSelectionModal';
import { useModalBodyClass } from '../../utils/useModalBodyClass';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    preSelectedPitchId?: string;
    preSelectedBusinessId?: string;
    preSelectedStartTime?: string;
    preSelectedDate?: string;
}

// Wrapper: always has the same hook count regardless of isOpen.
// Content is only mounted when open, so its hooks are always called consistently.
export const CreateMatchModal: React.FC<Props> = (props) => {
    useModalBodyClass(props.isOpen);
    if (!props.isOpen) return null;
    return <CreateMatchModalContent {...props} />;
};

const CreateMatchModalContent: React.FC<Props> = ({ isOpen, onClose, preSelectedPitchId, preSelectedBusinessId, preSelectedStartTime, preSelectedDate }) => {
    const { coords, radius, filterMode, isLocating } = useLocationContext();
    const navigate = useNavigate();
    const keyboardHeight = useKeyboardHeight();
    const [businesses, setBusinesses] = useState<Business[]>([]);

    // Selection state
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
    const [selectedPitchId, setSelectedPitchId] = useState(preSelectedPitchId || '');

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    };

    const [date, setDate] = useState(preSelectedDate || getTodayDate());
    const [time, setTime] = useState(preSelectedStartTime || '');
    const [level, setLevel] = useState(SkillLevel.INTERMEDIATE);
    const [note, setNote] = useState('');
    const [playerCount, setPlayerCount] = useState(7);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingLocation, setIsLoadingLocation] = useState(filterMode === 'NEARBY' && isLocating && !coords);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [bookedTimes, setBookedTimes] = useState<string[]>([]);
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
    const [matchType, setMatchType] = useState<'rakip_araniyor' | 'kendi_aramizda'>('rakip_araniyor');

    // Fetch nearby businesses from server (server-side geo filter)
    const fetchBusinessesNearby = async (c: { lat: number; lng: number }) => {
        const bList: Business[] = await getBusinesses({ lat: c.lat, lng: c.lng, radius });
        setBusinesses(bList);
    };

    // Fetch initial data (User & Businesses)
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // 1. Fetch User (fast — no spinner blocking the form)
                const userRes = await api.get('/users/me');
                setCurrentUser(userRes.data);
                if (userRes.data.team?.level) {
                    const rawLevel = userRes.data.team.level;
                    const levelMap: Record<string, SkillLevel> = {
                        BEGINNER: SkillLevel.BEGINNER,
                        INTERMEDIATE: SkillLevel.INTERMEDIATE,
                        ADVANCED: SkillLevel.ADVANCED,
                        EXPERT: SkillLevel.EXPERT,
                    };
                    setLevel(levelMap[rawLevel] ?? (rawLevel as SkillLevel));
                }

                // 2. For pre-selected pitch: fetch all businesses to locate the pitch by ID
                if (preSelectedPitchId) {
                    const bList: Business[] = await getBusinesses();
                    setBusinesses(bList);
                    const business = bList.find(b => b.pitches?.some(p => p.id === preSelectedPitchId));
                    if (business) {
                        setSelectedBusinessId(business.id);
                        setSelectedPitchId(preSelectedPitchId);
                    }
                    setIsLoadingLocation(false);
                    return;
                }

                // 3. Normal open OR preSelectedBusinessId: use geo filter (same as Marketplace)
                if (filterMode === 'ALL') {
                    const bList: Business[] = await getBusinesses();
                    setBusinesses(bList);
                } else if (coords) {
                    await fetchBusinessesNearby(coords);
                }
                if (preSelectedBusinessId) {
                    setSelectedBusinessId(preSelectedBusinessId);
                }
                setIsLoadingLocation(false);

            } catch (error) {
                console.error('Failed to fetch data:', error);
                setErrorMessage('Veriler yüklenirken hata oluştu.');
                setIsLoadingLocation(false);
            }
        };

        if (isOpen) {
            setIsLoadingLocation(filterMode === 'NEARBY');
            setBusinesses([]);
            setDate(preSelectedDate || getTodayDate());
            if (!preSelectedPitchId && !preSelectedBusinessId) {
                setSelectedBusinessId(null);
                setSelectedPitchId('');
                setSuccessMessage('');
                setErrorMessage('');
                setBookedTimes([]);
                setSearchQuery('');
            }
            fetchInitialData();
        }
    }, [isOpen, preSelectedPitchId, preSelectedBusinessId]);

    // Fetch booked slots when pitch or date changes
    useEffect(() => {
        const fetchBookedSlots = async () => {
            if (!selectedPitchId || !date) return;
            try {
                const reservations = await getReservationsByPitch(selectedPitchId, date);
                const approvedReservations = reservations.filter((r: any) => r.status === ReservationStatus.APPROVED);
                const times = approvedReservations.map((r: any) => {
                    const d = new Date(r.slotTime);
                    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false });
                });
                setBookedTimes(times);
            } catch (error) {
                console.error('Failed to fetch booked slots:', error);
            }
        };
        fetchBookedSlots();
    }, [selectedPitchId, date]);

    const myTeam = currentUser?.team;

    const handleSubmit = async () => {
        if (!myTeam || !selectedPitchId || !time || !date) {
            setErrorMessage('Lütfen tüm alanları doldurun');
            return;
        }
        setIsLoading(true);
        setErrorMessage('');
        try {
            const response = await api.post('/match-announcements', {
                pitchId: selectedPitchId,
                date,
                time,
                requiredLevel: level,
                playerCount,
                description: note,
                matchType
            });
            onClose();
            if (matchType === 'kendi_aramizda') {
                navigate('/chat', { state: { channelId: response.data.channelId || null } });
            } else {
                navigate('/');
            }
        } catch (error: any) {
            console.error('❌ Failed to create announcement:', error);
            const serverMessage = error.response?.data?.message;
            if (serverMessage) {
                setErrorMessage(serverMessage);
            } else {
                setErrorMessage('İlan oluşturulurken bir hata oluştu');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const getSelectedPitch = () => {
        if (!selectedPitchId) return null;
        for (const b of businesses) {
            const p = b.pitches?.find(pitch => pitch.id === selectedPitchId);
            if (p) return p;
        }
        return null;
    };
    const selectedPitch = getSelectedPitch();

    const getSelectedBusiness = () => {
        if (selectedBusinessId) return businesses.find(b => b.id === selectedBusinessId);
        if (selectedPitchId) return businesses.find(b => b.pitches?.some(p => p.id === selectedPitchId));
        return undefined;
    };
    const selectedBusiness = getSelectedBusiness();

    // Gece slotları (00:00-05:59) bir önceki günün gece devamı kabul edilir;
    // formda gerçek tarih (örn. "12 Haziran") gösterilir.
    const [timeHour] = (time || '').split(':').map(Number);
    const displayDate = date
        ? (time && isNightHour(timeHour) ? getSlotRealDateTime(date, time) : new Date(date))
        : null;

    const getEndTime = (startTime: string): string | null => {
        if (!startTime) return null;
        const match = selectedPitch?.timeSlots?.find(ts => ts.startTime === startTime);
        if (match) return match.endTime;
        const [h, m] = startTime.split(':').map(Number);
        const endHour = (h + 1) % 24;
        return `${String(endHour).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
    };
    const endTime = time ? getEndTime(time) : null;

    // Filter by search query only — server already handled geo + ordering
    const filteredBusinesses = useMemo(() => {
        if (!searchQuery.trim()) return businesses;
        const q = searchQuery.trim().toLocaleLowerCase('tr');
        return businesses.filter(b =>
            b.name.toLocaleLowerCase('tr').includes(q) ||
            b.pitches?.some(p => p.name.toLocaleLowerCase('tr').includes(q))
        );
    }, [businesses, searchQuery]);

    return (
        <>
            <div
                className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
                style={keyboardHeight > 0 ? { bottom: keyboardHeight } : undefined}
            >
                <div className="bg-slate-800 w-full max-w-lg sm:rounded-3xl rounded-t-3xl border border-slate-700 shadow-2xl shadow-turf-500/10 overflow-hidden flex flex-col max-h-[90%]">

                    {/* Header */}
                    <div className="p-6 border-b border-slate-700 bg-slate-900 flex justify-between items-center sticky top-0 z-10">
                        <div>
                            <h2 className="font-sport font-black text-2xl text-white italic uppercase tracking-wide">
                                MAÇ <span className="text-turf-500">KUR</span>
                            </h2>
                            <p className="text-slate-400 text-xs">Takımını topla, rakibini çağır.</p>
                        </div>
                        <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1">
                        {/* State Messages */}
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

                        {/* Match Type Toggle */}
                        <div className="mb-6 animate-fade-in">
                            <div className="flex p-1 bg-slate-900 rounded-xl">
                                <button
                                    onClick={() => setMatchType('rakip_araniyor')}
                                    className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${matchType === 'rakip_araniyor' ? 'bg-turf-600 text-white shadow-lg shadow-turf-600/30' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    <Shield className="w-4 h-4" />
                                    Rakip Aranıyor
                                </button>
                                <button
                                    onClick={() => setMatchType('kendi_aramizda')}
                                    className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${matchType === 'kendi_aramizda' ? 'bg-turf-600 text-white shadow-lg shadow-turf-600/30' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    <Store className="w-4 h-4" />
                                    Kendi Aramızda
                                </button>
                            </div>
                            {matchType === 'kendi_aramizda' && (
                                <div className="mt-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-3 rounded-xl flex gap-3 animate-fade-in text-xs leading-relaxed">
                                    <Info className="w-5 h-5 shrink-0" />
                                    <p><strong>Bilgilendirme:</strong> Kendi aramızda butonu ile ilgili saatte işletme onayı ile saha sadece sizin için rezerve edilecektir. Sizin için tek takımlı bir sohbet başlatılacaktır.</p>
                                </div>
                            )}
                        </div>

                        {/* Step 1: Pitch/Business Selection */}
                        <div className="mb-8 animate-fade-in">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-turf-600 text-slate-900 flex items-center justify-center text-[10px]">1</span>
                                Saha Seçimi
                            </label>

                            {preSelectedPitchId ? (
                                // READ ONLY VIEW if pre-selected
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex items-center gap-3">
                                    <div className="w-11 h-11 bg-slate-800 rounded-xl flex items-center justify-center text-turf-500 flex-shrink-0">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-white text-sm truncate">
                                            {businesses.find(b => b.pitches?.some(p => p.id === selectedPitchId))?.name}
                                        </div>
                                        <div className="text-xs text-slate-400 truncate">
                                            {selectedPitch?.name}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        <span className="text-turf-400 font-black text-base font-sport">₺{selectedPitch?.pricePerHour}</span>
                                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 border border-slate-700">Sabitlendi</span>
                                    </div>
                                </div>
                            ) : isLoadingLocation ? (
                                // GPS loading — only blocks business list, not the whole form
                                <div className="flex flex-col items-center justify-center py-10 gap-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                                    <LoadingSpinner />
                                    <p className="text-slate-500 text-xs">Konumunuz alınıyor...</p>
                                    <p className="text-slate-600 text-[10px]">Yakınındaki sahalar yükleniyor</p>
                                </div>
                            ) : (
                                <>
                                    {/* Location badge + Search row */}
                                    <div className="flex gap-2 mb-3">
                                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-turf-600 text-white border border-turf-500 shrink-0">
                                            <MapPin className="w-3.5 h-3.5" />
                                            Yakınımda ({radius}km)
                                        </div>
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder="Saha ara..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-turf-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Business List */}
                                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                                        {filteredBusinesses.length === 0 ? (
                                            <div className="text-center text-slate-500 text-xs py-8 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
                                                <MapPin className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                                                {searchQuery ? 'Arama sonucu bulunamadı.' : 'Yakınınızda saha bulunamadı.'}
                                            </div>
                                        ) : filteredBusinesses.map(business => (
                                            <div key={business.id} className={`rounded-xl border transition-all overflow-hidden ${selectedBusinessId === business.id ? 'border-turf-500 bg-slate-900' : 'border-slate-700 bg-slate-900/50'}`}>
                                                <div
                                                    onClick={() => {
                                        if (selectedBusinessId === business.id) {
                                            setSelectedBusinessId(null);
                                            setSelectedPitchId('');
                                        } else {
                                            setSelectedBusinessId(business.id);
                                            const firstPitch = business.pitches?.[0];
                                            if (firstPitch) setSelectedPitchId(firstPitch.id);
                                        }
                                    }}
                                                    className="p-3 cursor-pointer flex items-center gap-3 hover:bg-slate-800 transition-colors"
                                                >
                                                    <Store className={`w-5 h-5 shrink-0 ${selectedBusinessId === business.id ? 'text-turf-500' : 'text-slate-500'}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-white text-sm truncate">{business.name}</div>
                                                        <div className="text-xs text-slate-500">{business.district}, {business.city}</div>
                                                    </div>
                                                    {business.distanceKm != null && (
                                                        <span className="text-[10px] font-bold text-turf-400 bg-turf-900/30 border border-turf-500/30 px-2 py-0.5 rounded-full shrink-0">
                                                            {business.distanceKm} km
                                                        </span>
                                                    )}
                                                    <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform shrink-0 ${selectedBusinessId === business.id ? 'rotate-90' : ''}`} />
                                                </div>

                                                {/* Pitches List (if expanded) */}
                                                {selectedBusinessId === business.id && (
                                                    <div className="bg-slate-950/50 p-2 space-y-1 border-t border-slate-800">
                                                        {business.pitches?.map(pitch => (
                                                            <div
                                                                key={pitch.id}
                                                                onClick={() => setSelectedPitchId(pitch.id)}
                                                                className={`p-2 rounded-lg flex items-center justify-between cursor-pointer text-xs ${selectedPitchId === pitch.id ? 'bg-turf-900/40 text-turf-400 border border-turf-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span>{pitch.name}</span>
                                                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] uppercase">{pitch.type}</span>
                                                                </div>
                                                                <div className="font-bold">₺{pitch.pricePerHour}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Step 2: Date & Time */}
                        <div className="mb-8 animate-fade-in delay-75">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-turf-600 text-slate-900 flex items-center justify-center text-[10px]">2</span>
                                Zamanlama
                            </label>
                            <div className="space-y-3">
                                {/* Date Card */}
                                <div
                                    onClick={() => setIsDateModalOpen(true)}
                                    className="relative bg-slate-900 border border-slate-700 rounded-xl flex items-center gap-3 px-4 py-3 cursor-pointer hover:border-turf-500 transition-colors"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                                        <Calendar className="w-4 h-4 text-turf-400" />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">TARİH</div>
                                        <div className="text-white text-sm font-semibold">
                                            {displayDate
                                                ? displayDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })
                                                : 'Tarih Seçin'}
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-600" />
                                </div>

                                {/* Time Card */}
                                <div
                                    onClick={() => setIsTimeModalOpen(true)}
                                    className={`relative bg-slate-900 border border-slate-700 rounded-xl flex items-center gap-3 px-4 py-3 cursor-pointer hover:border-turf-500 transition-colors ${!selectedBusiness ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                                        <Clock className="w-4 h-4 text-turf-400" />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">SAAT</div>
                                        <div className="text-white text-sm font-semibold">
                                            {time
                                                ? (endTime ? `${time} - ${endTime}` : time)
                                                : selectedBusiness ? 'Saat Seçin' : 'Önce Saha Seçin'}
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-600" />
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Details */}
                        <div className="mb-4 animate-fade-in delay-150">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-turf-600 text-slate-900 flex items-center justify-center text-[10px]">3</span>
                                Detaylar
                            </label>

                            <div className="space-y-4">
                                {matchType === 'rakip_araniyor' && (
                                    <div>
                                        <span className="text-xs text-slate-400 mb-2 block">Aranan Rakip Seviyesi</span>
                                        <div className="flex p-1 bg-slate-900 rounded-lg">
                                            {Object.values(SkillLevel).map((lvl) => (
                                                <button
                                                    key={lvl}
                                                    onClick={() => setLevel(lvl)}
                                                    className={`flex-1 py-2 text-[10px] font-bold rounded transition-colors ${level === lvl ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    {lvl}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <span className="text-xs text-slate-400 mb-2 block">Kadro Boyutu</span>
                                    <div className="flex p-1 bg-slate-900 rounded-lg overflow-x-auto">
                                        {[5, 6, 7, 8, 11].map((count) => (
                                            <button
                                                key={count}
                                                onClick={() => setPlayerCount(count)}
                                                className={`flex-1 py-2 px-2 text-[10px] font-bold rounded transition-colors whitespace-nowrap ${playerCount === count ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                {count}v{count}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <span className="text-xs text-slate-400 mb-2 block">Kaptan Notu</span>
                                    <textarea
                                        rows={3}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-turf-500 focus:outline-none"
                                        placeholder="Örn: Forma rengimiz siyah. İddialıyız."
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        onFocus={(e) => {
                                            const el = e.target;
                                            setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-slate-900 border-t border-slate-800 sticky bottom-0 z-10">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Tahmini Saha Payı</div>
                                <div className="text-lg font-bold text-white">₺{selectedPitch ? (matchType === 'kendi_aramizda' ? selectedPitch.pricePerHour : selectedPitch.pricePerHour / 2) : '0'}</div>
                            </div>
                            {myTeam && (
                                <div className="flex items-center gap-2">
                                    <img src={myTeam.logoUrl} className="w-8 h-8 rounded-full border border-slate-600" />
                                    <span className="text-sm font-bold text-white">{myTeam.name}</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={!selectedPitchId || !date || !time || isLoading}
                            className="w-full bg-turf-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black uppercase italic py-4 rounded-xl text-lg shadow-lg shadow-turf-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? <LoadingSpinner size="sm" /> : <><Trophy className="w-5 h-5" /> İlanı Yayınla</>}
                        </button>
                    </div>

                </div>
            </div>

            <DateSelectionModal
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                onSelect={setDate}
                selectedDate={date}
                maxMonthsAhead={1}
            />

            <TimeSelectionModal
                isOpen={isTimeModalOpen}
                onClose={() => setIsTimeModalOpen(false)}
                onSelect={setTime}
                selectedTime={time}
                business={selectedBusiness}
                pitch={selectedPitch}
                selectedDate={date}
                bookedHours={bookedTimes}
            />
        </>
    );
};
