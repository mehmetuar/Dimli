
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_PITCHES, MOCK_MATCHES, MOCK_TEAMS } from '../constants';
import { MapPin, Star, Phone, ChevronRight, Users, Trophy, ChevronDown, MessageCircle, Shield, UserCheck, Clock, AlertCircle, X, CheckCircle, Wallet, Calendar } from 'lucide-react';
import { LevelBadge } from '../components/LevelBadge';
import { FairPlayScore } from '../components/FairPlayScore';
import { Team, MatchListing } from '../types';
import { CreateMatchModal } from '../components/CreateMatchModal';

export const PitchBooking: React.FC = () => {
  const [expandedPitchId, setExpandedPitchId] = useState<string | null>(null);
  const [viewingTeam, setViewingTeam] = useState<Team | null>(null);
  const [offerMode, setOfferMode] = useState<{matchId: string, teamName: string} | null>(null);
  const [offerNote, setOfferNote] = useState('');
  const [isOfferSent, setIsOfferSent] = useState(false);
  
  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalPitchId, setCreateModalPitchId] = useState<string | undefined>(undefined);
  const [createModalHour, setCreateModalHour] = useState<number | undefined>(undefined);

  const navigate = useNavigate();

  // Filter matches based on pitch ID
  const getMatchesForPitch = (pitchId: string) => {
    // Sort matches by date: today first, then future
    return MOCK_MATCHES.filter(m => m.pitchId === pitchId).sort((a, b) => {
       return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  };

  const handleSendOffer = () => {
    // Simulation
    setIsOfferSent(true);
    setTimeout(() => {
      setIsOfferSent(false);
      setOfferMode(null);
      setOfferNote('');
    }, 2000);
  };

  const handleCreateAd = (pitchId: string, hour?: number) => {
      setCreateModalPitchId(pitchId);
      setCreateModalHour(hour);
      setIsCreateModalOpen(true);
  };

  // Group Matches by Date
  const groupMatchesByDate = (matches: MatchListing[]) => {
     const grouped: Record<string, MatchListing[]> = {};
     matches.forEach(match => {
        if (!grouped[match.date]) grouped[match.date] = [];
        grouped[match.date].push(match);
     });
     return grouped;
  };

  const getRelativeDateLabel = (dateStr: string) => {
      const today = new Date().toISOString().split('T')[0];
      const date = new Date(dateStr);
      
      if (dateStr === today) return 'BUGÜN';
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (dateStr === tomorrow.toISOString().split('T')[0]) return 'YARIN';

      return date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // --- SUB-COMPONENT: TEAM DETAIL MODAL ---
  const TeamDetailModal = () => {
     if (!viewingTeam) return null;
     return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
           <div className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 overflow-hidden relative shadow-2xl shadow-turf-500/20 max-h-[90vh] overflow-y-auto">
              <button 
                 onClick={() => setViewingTeam(null)}
                 className="absolute top-4 right-4 bg-slate-900/50 p-2 rounded-full text-white hover:bg-red-500 transition-colors z-20"
              >
                 <X className="w-5 h-5" />
              </button>
              
              {/* Header */}
              <div className="h-32 relative">
                 <div className={`absolute inset-0 bg-gradient-to-b from-${viewingTeam.primaryColor} to-slate-800 opacity-80`}></div>
                 <img src={viewingTeam.logoUrl} className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 w-24 h-24 rounded-full border-4 border-slate-800 shadow-xl z-10 bg-slate-900 object-cover" />
              </div>
              
              <div className="pt-12 pb-8 px-6 text-center">
                 <h2 className="font-sport font-black text-3xl text-white uppercase italic">{viewingTeam.name}</h2>
                 <div className="flex justify-center items-center gap-2 mt-2 mb-4">
                    <LevelBadge level={viewingTeam.level} />
                    <FairPlayScore score={viewingTeam.fairPlayScore} />
                 </div>
                 
                 <p className="text-slate-300 italic text-sm mb-6 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">"{viewingTeam.description}"</p>
                 
                 {/* Stats Row */}
                 <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-700">
                       <div className="text-[10px] text-slate-500 uppercase font-bold">Galibiyet</div>
                       <div className="font-sport text-xl text-white">{viewingTeam.wins}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-700">
                       <div className="text-[10px] text-slate-500 uppercase font-bold">Mağlubiyet</div>
                       <div className="font-sport text-xl text-red-400">{viewingTeam.losses}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-700">
                       <div className="text-[10px] text-slate-500 uppercase font-bold">Son 3 Maç</div>
                       <div className="flex justify-center gap-1 mt-1">
                          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                          <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                       </div>
                    </div>
                 </div>

                 {/* Roster Preview */}
                 <div className="text-left mb-6">
                    <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                       <Users className="w-4 h-4 text-turf-500" /> MUHTEMEL KADRO
                    </h4>
                    <div className="bg-slate-900 rounded-xl p-2 space-y-1 border border-slate-700">
                        {[1,2,3,4,5,6,7].map(i => (
                           <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-lg transition-colors">
                              <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                 {i}
                              </div>
                              <div className="flex-1 text-sm text-slate-300">Oyuncu Adı Soyadı</div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase">MEV</div>
                           </div>
                        ))}
                    </div>
                 </div>

                 <button 
                    onClick={() => {
                       setViewingTeam(null);
                    }}
                    className="w-full bg-turf-600 text-white font-bold py-3 rounded-xl hover:bg-turf-500 transition-colors"
                 >
                    Kapat
                 </button>
              </div>
           </div>
        </div>
     );
  };

  // --- SUB-COMPONENT: OFFER MODAL ---
  const OfferModal = () => {
     if (!offerMode) return null;
     return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
           <div className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 p-6 relative">
              {isOfferSent ? (
                 <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                       <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Teklif Gönderildi!</h3>
                    <p className="text-slate-400">Rakip kaptan teklifini inceleyip dönüş yapacak.</p>
                 </div>
              ) : (
                 <>
                    <h3 className="text-xl font-bold text-white mb-1">Maç Teklifi Yap</h3>
                    <p className="text-sm text-slate-400 mb-4">
                       <span className="text-turf-500 font-bold">{offerMode.teamName}</span> takımına meydan okuyorsun.
                    </p>
                    
                    <div className="mb-4">
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Rakip Kaptana Notun (Opsiyonel)</label>
                       <textarea 
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-turf-500 focus:outline-none transition-colors"
                          rows={3}
                          placeholder="Örn: Kadromuz tam, maça hazırız. Forma rengimiz kırmızı..."
                          value={offerNote}
                          onChange={(e) => setOfferNote(e.target.value)}
                       />
                    </div>
                    
                    <div className="flex gap-3">
                       <button 
                          onClick={() => setOfferMode(null)}
                          className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors"
                       >
                          Vazgeç
                       </button>
                       <button 
                          onClick={handleSendOffer}
                          className="flex-1 bg-turf-600 text-white font-bold py-3 rounded-xl hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20"
                       >
                          Teklifi Gönder
                       </button>
                    </div>
                 </>
              )}
           </div>
        </div>
     );
  };

  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto">
      <TeamDetailModal />
      <OfferModal />
      <CreateMatchModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        preSelectedPitchId={createModalPitchId}
        preSelectedHour={createModalHour}
      />
      
      <header className="mb-8">
         <h1 className="font-sport font-black text-5xl text-white uppercase italic tracking-tighter">
            SAHALAR
         </h1>
         <p className="text-slate-400">Favori sahanı bul, takvimi incele ve maçı ayarla.</p>
      </header>
      
      <div className="space-y-6">
        {MOCK_PITCHES.map((pitch) => {
          const isExpanded = expandedPitchId === pitch.id;
          const activeMatches = getMatchesForPitch(pitch.id);
          const groupedMatches = groupMatchesByDate(activeMatches);

          return (
            <div key={pitch.id} className={`bg-slate-800 rounded-3xl overflow-hidden border transition-all duration-300 ${isExpanded ? 'border-turf-500 shadow-neon' : 'border-slate-700 shadow-lg'}`}>
               {/* Pitch Image Header */}
               <div 
                  className="h-44 relative cursor-pointer group"
                  onClick={() => setExpandedPitchId(isExpanded ? null : pitch.id)}
               >
                 <img src={pitch.imageUrl} alt={pitch.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>
                 
                 {/* Price Tag - Top Left */}
                 <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/50 shadow-lg">
                    <span className="text-turf-400 font-sport font-bold text-xl tracking-wide">₺{pitch.pricePerHour}</span>
                    <span className="text-slate-400 text-xs font-bold ml-1">/ Saat</span>
                 </div>

                 <div className="absolute bottom-4 left-4">
                    <h2 className="text-3xl font-sport font-black text-white italic uppercase drop-shadow-md">{pitch.name}</h2>
                    <div className="flex items-center gap-1 text-slate-200 text-sm font-medium">
                       <MapPin className="w-4 h-4 text-turf-500" /> {pitch.location}
                    </div>
                 </div>

                 <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-lg flex items-center gap-1 border border-slate-700">
                   <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                   <span className="font-bold text-white">{pitch.rating}</span>
                 </div>

                 <div className={`absolute bottom-4 right-4 bg-white/10 p-2 rounded-full backdrop-blur transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-white" />
                 </div>
               </div>
               
               {/* Expanded Content */}
               {isExpanded && (
                  <div className="p-5 animate-fade-in bg-slate-900/50">
                     
                     {/* --- SCHEDULE GRID (AVAILABILITY) --- */}
                     <div className="mb-8">
                        <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                           <Clock className="w-4 h-4 text-turf-500" /> BUGÜNÜN AKIŞI
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                           {pitch.schedule?.map((slot) => {
                              let slotClass = '';
                              let label = '';
                              let action = null;

                              if (slot.status === 'AVAILABLE') {
                                 slotClass = 'bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white cursor-pointer';
                                 label = 'BOŞ';
                                 action = () => handleCreateAd(pitch.id, slot.hour);
                              } else if (slot.status === 'BOOKED') {
                                 slotClass = 'bg-red-900/20 border-red-900/50 text-red-700 opacity-70 cursor-not-allowed';
                                 label = 'DOLU';
                              } else { // LOOKING_FOR_OPPONENT
                                 slotClass = 'bg-orange-900/20 border-orange-500/50 text-orange-400 animate-pulse';
                                 label = 'RAKİP ARANIYOR';
                              }

                              return (
                                 <div 
                                    key={slot.hour} 
                                    onClick={action || undefined}
                                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center relative overflow-hidden group ${slotClass}`}
                                 >
                                    <span className="text-lg font-sport font-bold">{slot.hour}:00</span>
                                    <span className="text-[10px] font-bold mt-1">{label}</span>
                                    
                                    {slot.status === 'AVAILABLE' && (
                                       <div className="absolute inset-0 bg-turf-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          <span className="text-white font-bold text-xs">+ İlan Aç</span>
                                       </div>
                                    )}
                                 </div>
                              )
                           })}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                           <AlertCircle className="w-3 h-3" /> Dolu saatlere ilan açılamaz. Boş saat seçip takımını kur.
                        </p>
                     </div>

                     {/* --- FACILITIES --- */}
                     <div className="mb-6">
                        <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                           <Trophy className="w-4 h-4 text-yellow-500" /> İMKANLAR
                        </h4>
                        <div className="flex flex-wrap gap-2">
                           {pitch.facilities.map((fac, i) => (
                             <span key={i} className="px-3 py-1 rounded-md bg-slate-700 text-slate-300 text-xs font-medium border border-slate-600">
                               {fac}
                             </span>
                           ))}
                        </div>
                     </div>

                     {/* --- ACTIVE MATCHES SECTION --- */}
                     {/* Added pb-24 to ensure last elements aren't hidden behind navbar on mobile */}
                     <div className="pb-20">
                        <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                           <Users className="w-4 h-4 text-blue-500" /> 
                           BURADA RAKİP ARAYANLAR ({activeMatches.length})
                        </h4>
                        
                        {activeMatches.length > 0 ? (
                           <div className="space-y-6">
                              {Object.keys(groupedMatches).map(date => (
                                <div key={date}>
                                    {/* Date Divider */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <Calendar className="w-4 h-4 text-turf-500" />
                                        <span className="text-sm font-bold text-turf-400 uppercase tracking-wide">
                                            {getRelativeDateLabel(date)}
                                        </span>
                                        <div className="flex-1 h-px bg-slate-700"></div>
                                    </div>

                                    <div className="space-y-3">
                                        {groupedMatches[date].map(match => {
                                            const team = MOCK_TEAMS.find(t => t.id === match.teamId);
                                            return (
                                            <div key={match.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col gap-3 group hover:border-turf-500/50 transition-colors relative overflow-hidden">
                                                <div className="absolute -right-6 -top-6 bg-turf-500/10 w-24 h-24 rounded-full blur-xl"></div>
                                                
                                                <div className="flex items-center justify-between relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <img src={match.teamLogo} className="w-14 h-14 rounded-full border-2 border-slate-600 object-cover bg-slate-900 shadow-md" alt={match.teamName}/>
                                                        <div>
                                                            <div className="text-white font-bold text-lg font-sport tracking-wide italic">{match.teamName}</div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                            <LevelBadge level={match.requiredLevel} />
                                                            <span className="text-xs text-white font-bold bg-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> {match.time}
                                                            </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Display Fair Play Score here for quick view */}
                                                    {team && <FairPlayScore score={team.fairPlayScore} />}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-700/50 relative z-10">
                                                    <button 
                                                        onClick={() => team && setViewingTeam(team)}
                                                        className="bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        <Shield className="w-4 h-4" /> Rakibi Görüntüle
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => setOfferMode({matchId: match.id, teamName: match.teamName})}
                                                        className="bg-turf-600 text-white hover:bg-turf-500 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-turf-600/20"
                                                    >
                                                        <Trophy className="w-4 h-4" /> Maç Teklifi Et
                                                    </button>
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
                              ))}
                           </div>
                        ) : (
                           <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50">
                              <p className="text-slate-500 text-sm mb-3">Bu sahada henüz aktif ilan yok.</p>
                              <button 
                                onClick={() => handleCreateAd(pitch.id)}
                                className="text-slate-900 bg-turf-500 px-6 py-2 rounded-lg text-sm font-bold hover:scale-105 transition-transform"
                              >
                                 İlk ilanı sen aç!
                              </button>
                           </div>
                        )}
                     </div>
                  </div>
               )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
