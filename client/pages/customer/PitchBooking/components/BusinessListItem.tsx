import React from 'react';
import { MapPin, Star, ChevronDown, Trophy, Navigation } from 'lucide-react';
import { Business } from '../../../../types';
import { PitchSchedule } from './PitchSchedule';
import { ActiveMatchesList } from './ActiveMatchesList';

interface BusinessListItemProps {
    business: Business;
    isExpanded: boolean;
    setExpandedBusinessId: (id: string | null) => void;
    selectedPitchIdInBusiness: Record<string, string>;
    setSelectedPitchIdInBusiness: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    selectedDate: string;
    pitchAnnouncements: any[];
    reservations: any[];
    isAuthorized: boolean;
    currentUser: any;
    myChallenges: any[];
    openSlotDetail: (slotTime: string, slotEndTime: string, resList: any[], announcements: any[], approvedReservation?: any) => void;
    handleCreateAd: (pitchId: string, startTime?: string) => void;
    handleUnauthorizedSlotClick: () => void;
    setViewingTeam: (team: any) => void;
    setOfferMode: (mode: { matchId: string, teamName: string }) => void;
    handleDeleteAdClick: (adId: string) => void;
    handleCancelClick: (challengeId: string) => void;
    distanceKm?: number;
}

export const BusinessListItem = React.memo<BusinessListItemProps>(({
    business, isExpanded, setExpandedBusinessId, selectedPitchIdInBusiness, setSelectedPitchIdInBusiness,
    selectedDate, pitchAnnouncements, reservations, isAuthorized, currentUser, myChallenges,
    openSlotDetail, handleCreateAd, handleUnauthorizedSlotClick, setViewingTeam, setOfferMode,
    handleDeleteAdClick, handleCancelClick, distanceKm
}) => {
    const selectedPitchId = selectedPitchIdInBusiness[business.id];
    const selectedPitch = business.pitches?.find(p => p.id === selectedPitchId);
    const displayPitch = selectedPitch || (business.pitches && business.pitches[0]);

    if (!business.pitches || business.pitches.length === 0) return null;

    const displayName = business.name.length > 16 ? business.name.slice(0, 16) + '..' : business.name;

    const activeMatches = pitchAnnouncements
        .filter(a => a.matchType !== 'kendi_aramizda')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <div className={`bg-slate-800 rounded-3xl overflow-hidden border transition-all duration-300 ${isExpanded ? 'border-turf-500 shadow-neon' : 'border-slate-700 shadow-lg'}`}>
            {/* Business Card Header */}
            <div
                className="aspect-video relative cursor-pointer group"
                onClick={() => setExpandedBusinessId(isExpanded ? null : business.id)}
            >
                <img src={displayPitch?.imageUrl || "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"} alt={business.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>

                {displayPitch && (
                    <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/50 shadow-lg">
                        <span className="text-turf-400 font-sport font-bold text-xl tracking-wide">₺{displayPitch.pricePerHour}</span>
                        <span className="text-slate-400 text-xs font-bold ml-1">/ Saat</span>
                    </div>
                )}

                {!isExpanded && (
                    <div className="absolute bottom-4 left-4 right-12 z-20 pointer-events-none">
                        <h2 className="text-2xl sm:text-3xl font-sport font-black text-white italic uppercase drop-shadow-2xl mb-0.5">
                            {displayName}
                        </h2>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-slate-200 text-sm font-medium drop-shadow-md">
                                <MapPin className="w-3.5 h-3.5 text-turf-500" /> {business.district}, {business.city}
                            </div>
                            {distanceKm !== undefined && (
                                <div className="flex items-center gap-1 bg-turf-600/40 border border-turf-500/50 px-2 py-0.5 rounded-full ml-1 backdrop-blur-sm shadow-md">
                                    <Navigation className="w-3 h-3 text-turf-400" />
                                    <span className="text-[11px] font-black text-white">{distanceKm} km</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-lg flex items-center gap-1.5 border border-slate-700">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-white">
                        {(business.ratingCount ?? 0) > 0 ? business.rating.toFixed(1) : '5.0'}
                    </span>
                    {(business.ratingCount ?? 0) > 0 && (
                        <span className="text-slate-400 text-xs">({business.ratingCount})</span>
                    )}
                </div>

                <div className={`absolute bottom-4 right-4 bg-white/10 p-2 rounded-full backdrop-blur transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-white" />
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-5 animate-fade-in bg-slate-900/50">
                    {/* FULL NAME & ADDRESS FOR CLARITY */}
                    <div className="mb-4 border-b border-slate-700/60 pb-3">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="text-xl font-sport font-black text-white uppercase italic leading-tight">{business.name}</h3>
                            {distanceKm !== undefined && (
                                <div className="flex items-center gap-1 bg-turf-600/20 border border-turf-500/40 px-2.5 py-1 rounded-full shrink-0">
                                    <Navigation className="w-3 h-3 text-turf-400" />
                                    <span className="text-xs font-black text-turf-300">{distanceKm} km</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-start gap-1.5 mt-1.5">
                            <MapPin className="w-3.5 h-3.5 text-turf-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold text-turf-400">{business.district}, {business.city}</p>
                                {business.address && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{business.address}</p>}
                            </div>
                        </div>
                    </div>

                    {/* PITCH TABS */}
                    {business.pitches && business.pitches.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto mb-6 pb-2 scrollbar-hide border-b border-slate-700">
                            {business.pitches.map(pitch => (
                                <button
                                    key={pitch.id}
                                    onClick={() => setSelectedPitchIdInBusiness(prev => ({ ...prev, [business.id]: pitch.id }))}
                                    className={`px-4 py-2 rounded-t-xl font-bold text-sm transition-all whitespace-nowrap ${selectedPitch && selectedPitch.id === pitch.id
                                        ? 'bg-turf-600 text-white border-b-2 border-turf-400'
                                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                >
                                    {pitch.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedPitch ? (
                        <>
                            <PitchSchedule
                                business={business}
                                selectedPitch={selectedPitch}
                                selectedDate={selectedDate}
                                pitchAnnouncements={pitchAnnouncements}
                                reservations={reservations}
                                isAuthorized={isAuthorized}
                                openSlotDetail={openSlotDetail}
                                handleCreateAd={handleCreateAd}
                                handleUnauthorizedSlotClick={handleUnauthorizedSlotClick}
                            />

                            <div className="mb-6">
                                <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-yellow-500" /> İMKANLAR
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedPitch.facilities?.map((fac: string, i: number) => (
                                        <span key={i} className="px-3 py-1 rounded-md bg-slate-700 text-slate-300 text-xs font-medium border border-slate-600">
                                            {fac}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <ActiveMatchesList
                                activeMatches={activeMatches}
                                currentUser={currentUser}
                                myChallenges={myChallenges}
                                isAuthorized={isAuthorized}
                                setViewingTeam={setViewingTeam}
                                setOfferMode={setOfferMode}
                                handleDeleteAdClick={handleDeleteAdClick}
                                handleCancelClick={handleCancelClick}
                                selectedPitch={selectedPitch}
                                handleCreateAd={handleCreateAd}
                            />
                        </>
                    ) : (
                        <div className="text-center text-slate-500 p-4">Lütfen bir saha seçin.</div>
                    )}
                </div>
            )}
        </div>
    );
});
