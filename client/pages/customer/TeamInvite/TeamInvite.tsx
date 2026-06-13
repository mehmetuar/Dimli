import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Users, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import api from '../../../services/api';
import { LevelBadge } from '../../../components/UI/LevelBadge';
import { Team } from '../../../types';

export const TeamInvite: React.FC = () => {
    const { shortId } = useParams<{ shortId: string }>();
    const navigate = useNavigate();

    const [team, setTeam] = useState<Team | null>(null);
    const [alreadyInTeam, setAlreadyInTeam] = useState(false);
    const [isSameTeam, setIsSameTeam] = useState(false);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'joining' | 'joined'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!shortId) return;

        const load = async () => {
            try {
                const [teamRes, meRes] = await Promise.all([
                    api.get(`/teams/search/${encodeURIComponent(shortId)}`),
                    api.get('/users/me'),
                ]);
                const found: Team | undefined = Array.isArray(teamRes.data) ? teamRes.data[0] : teamRes.data;
                if (!found) {
                    setErrorMessage('Bu davet linki geçersiz veya takım bulunamadı.');
                    setStatus('error');
                    return;
                }
                setTeam(found);
                setAlreadyInTeam(!!meRes.data?.teamId);
                setIsSameTeam(!!meRes.data?.teamId && meRes.data.teamId === found.id);
                setStatus('ready');
            } catch {
                setErrorMessage('Davet bilgileri yüklenirken bir hata oluştu.');
                setStatus('error');
            }
        };
        load();
    }, [shortId]);

    const handleJoin = async () => {
        if (!team) return;
        setStatus('joining');
        setErrorMessage('');
        try {
            await api.post(`/teams/${team.id}/join-via-invite`);
            setStatus('joined');
            setTimeout(() => navigate('/team', { replace: true }), 1200);
        } catch (err: any) {
            setErrorMessage(err.response?.data?.message || 'Takıma katılırken bir hata oluştu.');
            setStatus('ready');
        }
    };

    return (
        <div className="min-h-full flex flex-col items-center justify-center px-4 py-10">
            <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-700 bg-slate-900 flex items-center gap-3">
                    <button onClick={() => navigate('/')} className="p-2 -ml-2 text-slate-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="font-sport font-black text-xl text-white italic uppercase tracking-wide">
                            TAKIM <span className="text-turf-500">DAVETİ</span>
                        </h1>
                        <p className="text-slate-400 text-xs">Bir arkadaşın seni takımına çağırdı.</p>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {status === 'loading' && (
                        <div className="flex flex-col items-center gap-3 py-8 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p className="text-sm">Davet bilgileri yükleniyor...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center gap-3 py-8 text-center">
                            <AlertCircle className="w-10 h-10 text-red-400" />
                            <p className="text-slate-300 text-sm">{errorMessage}</p>
                            <button
                                onClick={() => navigate('/')}
                                className="mt-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                            >
                                Ana Sayfaya Dön
                            </button>
                        </div>
                    )}

                    {team && status !== 'loading' && status !== 'error' && (
                        <>
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden">
                                    {team.logoUrl ? (
                                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Users className="w-9 h-9 text-slate-500" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-white font-black text-lg">{team.name}</h2>
                                    <div className="mt-1 flex items-center justify-center gap-2">
                                        <LevelBadge level={team.level as unknown as string} />
                                    </div>
                                </div>
                            </div>

                            {status === 'joined' ? (
                                <div className="flex flex-col items-center gap-2 py-4 text-center">
                                    <CheckCircle className="w-10 h-10 text-turf-500" />
                                    <p className="text-white font-bold text-sm">Takıma katıldın!</p>
                                    <p className="text-slate-400 text-xs">Takım sayfana yönlendiriliyorsun...</p>
                                </div>
                            ) : isSameTeam ? (
                                <div className="bg-slate-900/60 border border-slate-700 border-dashed rounded-xl p-4 text-center">
                                    <CheckCircle className="w-6 h-6 text-turf-500 mx-auto mb-2" />
                                    <p className="text-slate-300 text-sm">
                                        Zaten <span className="font-bold">{team.name}</span> takımının bir üyesisin.
                                    </p>
                                    <button
                                        onClick={() => navigate('/team', { state: { openModal: true } })}
                                        className="mt-3 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                                    >
                                        Takımıma Git
                                    </button>
                                </div>
                            ) : alreadyInTeam ? (
                                <div className="bg-slate-900/60 border border-slate-700 border-dashed rounded-xl p-4 text-center">
                                    <AlertCircle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                                    <p className="text-slate-300 text-sm">
                                        Zaten bir takımdasın. <span className="font-bold">{team.name}</span> takımına
                                        katılmak için önce mevcut takımından ayrılmalısın.
                                    </p>
                                    <button
                                        onClick={() => navigate('/team', { state: { openModal: true } })}
                                        className="mt-3 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                                    >
                                        Takım Ayarlarına Git
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {errorMessage && (
                                        <p className="text-red-400 text-xs text-center">{errorMessage}</p>
                                    )}
                                    <button
                                        onClick={handleJoin}
                                        disabled={status === 'joining'}
                                        className="w-full bg-turf-600 hover:bg-turf-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-neon transition-colors flex items-center justify-center gap-2"
                                    >
                                        {status === 'joining' ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Users className="w-4 h-4" />
                                        )}
                                        Takıma Katıl
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
