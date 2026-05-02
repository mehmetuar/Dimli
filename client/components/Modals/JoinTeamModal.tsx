
import React, { useState, useEffect, useRef } from 'react';
import { X, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { Team } from '../../types';
import api from '../../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinTeamModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [foundTeams, setFoundTeams] = useState<Team[]>([]);
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [sentTeamId, setSentTeamId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchTerm.trim().length < 2) {
      setFoundTeams([]);
      setError('');
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setError('');
      try {
        const response = await api.get(`/teams/search/${encodeURIComponent(searchTerm.trim())}`);
        const teams: Team[] = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);
        setFoundTeams(teams);
        if (teams.length === 0) setError('Eşleşen takım bulunamadı.');
      } catch {
        setError('Arama sırasında bir hata oluştu.');
        setFoundTeams([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm]);

  const handleJoinRequest = async (team: Team) => {
    try {
      await api.post('/join-requests', { teamId: team.id, message: '' });
      setSentTeamId(team.id);
      setTimeout(() => {
        onClose();
        setSearchTerm('');
        setFoundTeams([]);
        setSentTeamId(null);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Katılma isteği gönderilemedi.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">

        {/* Header */}
        <div className="p-5 border-b border-slate-700 bg-slate-900 flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-sport font-black text-2xl text-white italic uppercase tracking-wide">
              TAKIM <span className="text-blue-500">BUL</span>
            </h2>
            <p className="text-slate-400 text-xs">İsim veya takım kodu ile ara.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setSentTeamId(null); }}
              placeholder="Takım adı veya kod (örn: KNY-042)"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-white text-sm focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            <div className="absolute right-3 top-3 text-slate-400">
              <Search className={`w-5 h-5 ${isSearching ? 'animate-pulse text-blue-400' : ''}`} />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 p-3 rounded-xl border border-red-900/50">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Results List */}
          {foundTeams.length > 0 && (
            <div className="space-y-3">
              {foundTeams.map(team => (
                <div key={team.id} className="bg-slate-900 rounded-xl p-4 border border-slate-700 animate-fade-in">
                  {sentTeamId === team.id ? (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-white font-bold text-sm">İstek Gönderildi!</p>
                      <p className="text-slate-400 text-xs mt-1">Kaptan onayladığında kadroya dahil olacaksın.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-3">
                        {team.logoUrl ? (
                          <img src={team.logoUrl} className="w-14 h-14 rounded-full border-2 border-slate-600 object-cover bg-slate-800 shrink-0" alt={team.name} />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-white font-black text-lg shrink-0">
                            {team.name?.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-sport font-black text-xl text-white italic uppercase truncate">{team.name}</h3>
                          <span className="text-xs text-slate-500 font-mono">
                            #{team.shortId || team.id?.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                        <div className="bg-slate-800 p-2 rounded-lg">
                          <div className="text-[10px] text-slate-500 uppercase font-bold">Oynanan Maç</div>
                          <div className="text-white font-bold">{(team as any).playedMatchCount ?? 0}</div>
                        </div>
                        <div className="bg-slate-800 p-2 rounded-lg">
                          <div className="text-[10px] text-slate-500 uppercase font-bold">Kaptan</div>
                          <div className="text-white font-bold truncate px-1 text-sm">
                            {team.captain?.full_name || team.captain?.username || 'Bilinmiyor'}
                          </div>
                        </div>
                        <div className="bg-slate-800 p-2 rounded-lg">
                          <div className="text-[10px] text-slate-500 uppercase font-bold">FP Puanı</div>
                          <div className="text-yellow-500 font-bold">{team.fairPlayScore}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleJoinRequest(team)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-600/20 text-sm"
                      >
                        Katılma İsteği Gönder
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
