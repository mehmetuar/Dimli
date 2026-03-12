
import React, { useState } from 'react';
import { X, Search, Shield, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { MOCK_TEAMS, CURRENT_USER } from '../../constants';
import { Team } from '../../types';
import api from '../../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinTeamModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [foundTeam, setFoundTeam] = useState<Team | null>(null);
  const [error, setError] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSearch = async () => {
    setError('');
    setFoundTeam(null);
    setIsSent(false);

    if (!searchTerm.trim()) return;

    try {
      const response = await api.get(`/teams/search/${encodeURIComponent(searchTerm.trim())}`);
      if (response.data) {
        setFoundTeam(response.data);
      } else {
        setError('Bu isimde bir takım bulunamadı.');
      }
    } catch (error) {
      console.error('Team search failed:', error);
      setError('Bu isimde bir takım bulunamadı.');
    }
  };

  const handleJoinRequest = async () => {
    if (!foundTeam) return;

    try {
      await api.post('/join-requests', {
        teamId: foundTeam.id,
        message: '' // Optional message,can be added if needed
      });

      // Show success UI
      setIsSent(true);

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSearchTerm('');
        setFoundTeam(null);
        setIsSent(false);
      }, 2000);
    } catch (error: any) {
      console.error('Failed to send join request:', error);
      setError(error.response?.data?.message || 'Katılma isteği gönderilemedi.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="p-5 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
          <div>
            <h2 className="font-sport font-black text-2xl text-white italic uppercase tracking-wide">
              TAKIM <span className="text-blue-500">BUL</span>
            </h2>
            <p className="text-slate-400 text-xs">İsmi biliyorsan, takımı bulursun.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Tam takım adını girin (Örn: Şişli United)"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-2 bg-slate-800 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 p-3 rounded-xl border border-red-900/50">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {/* Found Team Card */}
          {foundTeam && !isSent && (
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 animate-fade-in">
              <div className="flex items-center gap-4 mb-4">
                <img src={foundTeam.logoUrl} className="w-16 h-16 rounded-full border-2 border-slate-600 object-cover bg-slate-800" />
                <div>
                  <h3 className="font-sport font-black text-2xl text-white italic uppercase">{foundTeam.name}</h3>
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <MapPin className="w-3 h-3 text-blue-500" /> {foundTeam.location}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-slate-800 p-2 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Galibiyet</div>
                  <div className="text-white font-bold">{foundTeam.wins}</div>
                </div>
                <div className="bg-slate-800 p-2 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Kaptan</div>
                  <div className="text-white font-bold truncate px-1">
                    {foundTeam.captain?.full_name || foundTeam.captain?.username || 'Bilinmiyor'}
                  </div>
                </div>
                <div className="bg-slate-800 p-2 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">FP Puanı</div>
                  <div className="text-yellow-500 font-bold">{foundTeam.fairPlayScore}</div>
                </div>
              </div>

              <button
                onClick={handleJoinRequest}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/20"
              >
                Katılma İsteği Gönder
              </button>
            </div>
          )}

          {isSent && (
            <div className="text-center py-8 bg-slate-900/50 rounded-xl border border-slate-700/50">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">İstek Gönderildi!</h3>
              <p className="text-slate-400 text-sm">Takım kaptanı onayladığında kadroya dahil olacaksın.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
