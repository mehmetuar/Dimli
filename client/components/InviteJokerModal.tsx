

import React, { useState } from 'react';
import { Player } from '../types';
import { MOCK_MATCHES, CURRENT_USER } from '../constants';
import { X, Calendar, MapPin, Send, CheckCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  joker: Player | null;
}

export const InviteJokerModal: React.FC<Props> = ({ isOpen, onClose, joker }) => {
  if (!isOpen || !joker) return null;

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  // Filter matches where the current user's team is the organizer
  const myMatches = MOCK_MATCHES.filter(m => m.teamId === CURRENT_USER.teamId);

  const handleSendInvite = () => {
    if (!selectedMatchId) return;

    // Simulate sending invite and acceptance
    setIsSent(true);
    
    // In a real app, this would be an API call.
    // Here we simulate the Joker accepting the invite and being added to the team temporarily.
    // We'll handle the UI update in the parent component or via a context/store refresh.
    
    setTimeout(() => {
        setIsSent(false);
        onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
       <div className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 p-6 relative shadow-2xl">
          <button 
             onClick={onClose}
             className="absolute top-4 right-4 text-slate-400 hover:text-white"
          >
             <X className="w-6 h-6" />
          </button>

          {isSent ? (
             <div className="text-center py-8">
                <div className="w-20 h-20 bg-turf-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce shadow-neon">
                   <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-wide">DAVET İLETİLDİ!</h3>
                <p className="text-slate-400 mt-2 text-sm">
                   {joker.name} daveti kabul ettiğinde bildirim alacaksın.
                </p>
             </div>
          ) : (
             <>
                <div className="text-center mb-6">
                   <div className="w-20 h-20 mx-auto rounded-full p-1 bg-gradient-to-r from-turf-500 to-blue-500 mb-3">
                      <img src={joker.avatarUrl} className="w-full h-full rounded-full object-cover border-4 border-slate-800" />
                   </div>
                   <h3 className="text-xl font-bold text-white">
                      <span className="text-turf-500">{joker.name}</span> için Maç Seç
                   </h3>
                   <p className="text-xs text-slate-400 mt-1">Hangi maç için desteğe ihtiyacın var?</p>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto mb-6 pr-1">
                   {myMatches.length > 0 ? (
                      myMatches.map(match => (
                         <div 
                            key={match.id}
                            onClick={() => setSelectedMatchId(match.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                               selectedMatchId === match.id 
                               ? 'bg-turf-900/30 border-turf-500' 
                               : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                            }`}
                         >
                            <div className="bg-slate-800 p-2 rounded-lg">
                               <Calendar className={`w-5 h-5 ${selectedMatchId === match.id ? 'text-turf-500' : 'text-slate-400'}`} />
                            </div>
                            <div className="flex-1">
                               <div className="text-white font-bold text-sm">{match.date}</div>
                               <div className="text-xs text-slate-500 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {match.pitchName}
                               </div>
                            </div>
                            <div className="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">
                               {match.time}
                            </div>
                         </div>
                      ))
                   ) : (
                      <div className="text-center py-4 bg-slate-900 rounded-xl border border-dashed border-slate-700">
                         <p className="text-slate-500 text-sm">Aktif maç ilanınız bulunmuyor.</p>
                      </div>
                   )}
                </div>

                <button 
                   onClick={handleSendInvite}
                   disabled={!selectedMatchId}
                   className="w-full bg-turf-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3.5 rounded-xl hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 flex items-center justify-center gap-2"
                >
                   <Send className="w-4 h-4" /> Davet Gönder
                </button>
             </>
          )}
       </div>
    </div>
  );
};