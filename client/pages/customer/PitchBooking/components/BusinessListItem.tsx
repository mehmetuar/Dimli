import React from 'react';
import { MapPin, Star, ChevronDown, Trophy, Navigation } from 'lucide-react';
import { Business } from '../../../../types';
import { PitchSchedule } from './PitchSchedule';
import { ActiveMatchesList } from './ActiveMatchesList';
import { groupMatchesByDate } from '../utils/pitchUtils';

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
    handleReserve: (pitchId: string, startTime: string) => void;
    setViewingTeam: (team: any) => void;
    setOfferMode: (mode: { matchId: string, teamName: string }) => void;
    handleDeleteAdClick: (adId: string) => void;
    handleCancelClick: (challengeId: string) => void;
    distanceKm?: number;
}

export const BusinessListItem: React.FC<BusinessListItemProps> = ({
    business, isExpanded, setExpandedBusinessId, selectedPitchIdInBusiness, setSelectedPitchIdInBusiness,
    selectedDate, pitchAnnouncements, reservations, isAuthorized, currentUser, myChallenges,
    openSlotDetail, handleCreateAd, handleReserve, setViewingTeam, setOfferMode,
    handleDeleteAdClick, handleCancelClick, distanceKm
}) => {
    const selectedPitchId = selectedPitchIdInBusiness[business.id];
    const selectedPitch = business.pitches?.find(p => p.id === selectedPitchId);
    const displayPitch = selectedPitch || (business.pitches && business.pitches[0]);

    if (!business.pitches || business.pitches.length === 0) return null;

    const activeMatches = pitchAnnouncements
        .filter(a => a.matchType !== 'kendi_aramizda')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const groupedMatches = groupMatchesByDate(activeMatches);

    return (
        <div className={`bg-slate-800 rounded-3xl overflow-hidden border transition-all duration-300 ${isExpanded ? 'border-turf-500 shadow-neon' : 'border-slate-700 shadow-lg'}`}>
            {/* Business Card Header */}
            <div
                className="h-44 relative cursor-pointer group"
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

                <div className="absolute bottom-4 left-4 pr-16 border-r-transparent">
                    <h2 className="text-3xl font-sport font-black text-white italic uppercase drop-shadow-md">{business.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-slate-200 text-sm font-medium">
                            <MapPin className="w-4 h-4 text-turf-500" /> {business.district}, {business.city}
                        </div>
                        {distanceKm !== undefined && (
                            <div className="flex items-center gap-1 bg-turf-600/30 border border-turf-500/50 px-2 py-0.5 rounded-full ml-1 backdrop-blur-sm shadow-md">
                                <Navigation className="w-3 h-3 text-turf-400" />
                                <span className="text-[11px] font-black text-white">{distanceKm} km</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-lg flex items-center gap-1 border border-slate-700">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-white">{business.rating}</span>
                </div>

                <div className={`absolute bottom-4 right-4 bg-white/10 p-2 rounded-full backdrop-blur transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-white" />
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-5 animate-fade-in bg-slate-900/50">
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
                                handleReserve={handleReserve}
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
                                groupedMatches={groupedMatches}
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
};
