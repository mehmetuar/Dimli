
import React, { useState, useEffect, useRef } from 'react';
import { X, Search, CheckCircle, AlertCircle, Loader2, Clock, Users } from 'lucide-react';
import { Team } from '../../../../types';
import api from '../../../../services/api';
import { KeyboardAwareModal } from '../../../../components/Modals/KeyboardAwareModal';
import { teamInitialsAvatar } from '../../../../utils/teamColors';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinTeamModal: React.FC<Props> = (props) => {
  if (!props.isOpen) return null;
  return <JoinTeamModalContent {...props} />;
};

const JoinTeamModalContent: React.FC<Props> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [foundTeams, setFoundTeams] = useState<Team[]>([]);
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Record<string, string>>({});
  const [flashTeamId, setFlashTeamId] = useState<string | null>(null);
  const [cancellingTeamId, setCancellingTeamId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get('/join-requests/my-pending').then((res) => {
      const map: Record<string, string> = {};
      for (const req of res.data) map[req.teamId] = req.id;
      setPendingRequests(map);
    }).catch(() => {});
  }, []);

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
        const res = await api.get(`/teams/search/${encodeURIComponent(searchTerm.trim())}`);
        const teams: Team[] = Array.isArray(res.data) ? res.data : res.data ? [res.data] : [];
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
    setError('');
    try {
      const res = await api.post('/join-requests', { teamId: team.id, message: '' });
      setPendingRequests(prev => ({ ...prev, [team.id]: res.data.id }));
      setFlashTeamId(team.id);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlashTeamId(null), 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Katılma isteği gönderilemedi.');
    }
  };

  const handleCancelRequest = async (team: Team) => {
    const requestId = pendingRequests[team.id];
    if (!requestId) return;
    setError('');
    setCancellingTeamId(team.id);
    try {
      await api.patch(`/join-requests/${requestId}/cancel`);
      setPendingRequests(prev => { const n = { ...prev }; delete n[team.id]; return n; });
      if (flashTeamId === team.id) setFlashTeamId(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'İstek iptal edilemedi.');
    } finally {
      setCancellingTeamId(null);
    }
  };

  return (
    <KeyboardAwareModal
      isOpen={isOpen}
      portalToBody
      zClassName="z-[70]"
      backdropClassName="animate-fade-in"
      backdropStyle={{ backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
      panelClassName="w-full max-w-sm rounded-3xl"
      panelStyle={{
        background: '#0f1923',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}
      maxHeightClassName="max-h-[calc(100vh-80px)]"
      bodyClassName=""
      header={
        <div
          className="px-5 pt-5 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-sport font-black text-2xl text-white italic uppercase tracking-wide leading-none">
                TAKIM <span className="text-blue-500">BUL</span>
              </h2>
              <p className="text-slate-500 text-xs mt-1">İsim veya takım kodu ile ara</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setError(''); }}
              placeholder="Takım adı veya kod (örn: KNY-042)"
              className="w-full rounded-2xl py-3 pl-10 pr-4 text-white text-sm placeholder:text-slate-600 focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.09)',
              }}
              autoFocus
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              {isSearching
                ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                : <Search className="w-4 h-4" />}
            </div>
          </div>
        </div>
      }
    >
          {/* Error banner */}
          {error && (
            <div className="mx-4 mt-4 flex items-start gap-2 text-red-400 text-sm p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Empty state */}
          {!isSearching && foundTeams.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Users className="w-7 h-7 text-slate-600" />
              </div>
              <p className="text-slate-600 text-sm">Aramak için en az 2 karakter gir</p>
            </div>
          )}

          {/* Team cards */}
          {foundTeams.length > 0 && (
            <div className="p-4 space-y-3">
              {foundTeams.map(team => {
                const isPending = !!pendingRequests[team.id];
                const isFlashing = flashTeamId === team.id;
                const isCancelling = cancellingTeamId === team.id;

                return (
                  <div
                    key={team.id}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isPending ? 'rgba(59,130,246,0.22)' : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    {/* Team row */}
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                      {team.logoUrl ? (
                        <img
                          src={team.logoUrl}
                          className="w-11 h-11 rounded-xl object-cover shrink-0"
                          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                          alt={team.name}
                          onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = teamInitialsAvatar(team?.name); }}
                        />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-blue-400 font-black text-sm shrink-0"
                          style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)' }}
                        >
                          {team.name?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-sport font-black text-lg text-white italic uppercase leading-none truncate">
                          {team.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-slate-600 font-mono">
                            #{team.shortId || team.id?.slice(0, 8).toUpperCase()}
                          </span>
                          {isPending && (
                            <span
                              className="flex items-center gap-1 text-[10px] font-bold text-blue-400 px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}
                            >
                              <Clock className="w-2.5 h-2.5" /> Beklemede
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 px-4 pb-3">
                      {[
                        { label: 'Maç', value: (team as any).playedMatchCount ?? 0, cls: 'text-white' },
                        {
                          label: 'Kaptan',
                          value: team.captain?.full_name?.split(' ')[0] || team.captain?.username || '—',
                          cls: 'text-white',
                        },
                        { label: 'FP Puanı', value: team.fairPlayScore, cls: 'text-yellow-400' },
                      ].map(({ label, value, cls }) => (
                        <div key={label} className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <div className="text-[9px] text-slate-600 uppercase font-bold tracking-wide">{label}</div>
                          <div className={`text-sm font-bold mt-0.5 truncate ${cls}`}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Action */}
                    <div className="px-4 pb-4">
                      {isFlashing ? (
                        <div
                          className="flex items-center gap-3 rounded-xl px-4 py-3"
                          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.22)' }}
                        >
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-green-400 font-bold text-sm leading-none">İstek Gönderildi!</p>
                            <p className="text-green-700 text-xs mt-0.5">Kaptan onayladığında kadroya dahil olacaksın</p>
                          </div>
                        </div>
                      ) : isPending ? (
                        <button
                          onClick={() => handleCancelRequest(team)}
                          disabled={isCancelling}
                          className="w-full font-semibold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 active:scale-95"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#94a3b8',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.25)';
                            (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
                            (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
                          }}
                        >
                          {isCancelling
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> İptal ediliyor...</>
                            : 'İsteği Geri Çek'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinRequest(team)}
                          className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-2.5 rounded-xl transition-all text-sm"
                          style={{ boxShadow: '0 4px 20px rgba(59,130,246,0.25)' }}
                        >
                          Katılma İsteği Gönder
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </KeyboardAwareModal>
  );
};
