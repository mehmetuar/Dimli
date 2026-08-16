import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { UserProfile } from '../UserProfile/UserProfile';
import { MyTeam } from '../MyTeam/MyTeam';
import { startTour, isTourActive } from '../../../services/tourStore';
import { isTourDone } from '../../../services/tourStorage';

export const TeamProfile: React.FC = () => {
    const location = useLocation();
    // Dışarıdan openModal state geliyorsa doğrudan TAKIMIM tabını aç
    const hasTeamModal = !!(location.state as any)?.openModal;
    const [activeTab, setActiveTab] = useState<'PLAYER' | 'TEAM'>(() => {
        // Takım kurulunca kutlama sonrası reload → TAKIMIM (Profilim değil) ile aç.
        // Bayrak TeamModals onDone'da set edilir; burada okunup temizlenir.
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tp_active_tab') === 'TEAM') {
            sessionStorage.removeItem('tp_active_tab');
            return 'TEAM';
        }
        return hasTeamModal ? 'TEAM' : 'PLAYER';
    });

    // Takım turu: yalnız kayıt akışının 'pending' işaretlediği kullanıcıda, sayfaya
    // İLK girişte bir kez. Sahalar turundan ZİNCİRLEME gelindiyse tur zaten aktif —
    // isTourActive() guard'ı üst üste başlatmayı engeller.
    useEffect(() => {
        if (!isTourActive() && !isTourDone('team')) startTour('team');
    }, []);

    return (
        <div
            className="fixed inset-0 bg-pitch flex flex-col overflow-hidden"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            {/* SABİT başlık: PROFİLİM / TAKIMIM tab switcher — scroll'da kaybolmaz.
                NOT: Bu ağaçtaki modallar createPortal(document.body) ile render edilir (iOS
                WebkitOverflowScrolling scroll konteyneri fixed modalları hapsediyor) — böylece
                modal backdrop'u bu barı da örter; bar arkada doğal karartılmış görünür. */}
            <div className="team-profile-tabs flex-shrink-0 px-4 pt-2 pb-3">
                <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700 shadow-lg max-w-3xl mx-auto" data-tour-id="team-tabs">
                    <button
                        onClick={() => setActiveTab('PLAYER')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'PLAYER' ? 'bg-turf-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        PROFİLİM
                    </button>
                    <button
                        data-tour-id="team-tab-takimim"
                        onClick={() => setActiveTab('TEAM')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'TEAM' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        TAKIMIM
                    </button>
                </div>
            </div>

            {/* ELASTIC içerik: altındaki sayfa esnek kayar (iOS bounce); başlık sabit kalır */}
            <div
                className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(5rem + var(--safe-bottom))' } as React.CSSProperties}
            >
                <div className="px-4 max-w-3xl mx-auto">
                    {activeTab === 'PLAYER' ? <UserProfile /> : <MyTeam />}
                </div>
            </div>
        </div>
    );
};
