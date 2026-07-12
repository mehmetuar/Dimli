import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Users, MoreVertical } from 'lucide-react';
import { MatchStatusBadge } from '../../pages/customer/Chat/components/MatchStatusBadge';
import { getMatchStatusInfo } from '../../pages/customer/Chat/utils/chatUtils';
import { SystemMessageRenderer } from '../UI/SystemMessageRenderer';
import { requestTourSkipConfirm } from '../../services/tourStore';
import { DEMO_TEAM } from '../../pages/customer/PitchBooking/demo/demoTourData';

// ─────────────────────────────────────────────────────────────────────────────
// Sahte maç sohbeti — Sahalar turunun 7-8. adımları. Gerçek Chat sayfasının
// hafif bir GÖRSEL replikası: rota değişmez, socket/kanal listesi hiç çalışmaz
// (gerçek Chat'e sahte kanal enjekte etmek socket olaylarıyla bozulurdu).
// Saf parçalar yeniden kullanılır: MatchStatusBadge + getMatchStatusInfo
// (üretimle birebir "Onay Bekliyor") ve SystemMessageRenderer (ikonlu sistem
// mesajı). MessageBubble bilinçli olarak KULLANILMAZ (native long-press
// dinleyicileri ve zorunlu handler'ları var).
// z-[9980]: modallar z-[70] üstü, TourOverlay z-[9990] altı.
// ─────────────────────────────────────────────────────────────────────────────

export const DemoChat: React.FC = () => {
    // Rozet "Onay Bekliyor" göstersin diye slot GELECEKTE olmalı: bugün 20:00
    // geçtiyse yarın 20:00 (getMatchStatusInfo geçmiş PENDING'i "Oynanmamış" sayar).
    const reservation = useMemo(() => {
        const d = new Date();
        d.setHours(20, 0, 0, 0);
        if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
        return { status: 'PENDING', slotTime: d.toISOString() };
    }, []);
    const statusInfo = getMatchStatusInfo(reservation);

    return createPortal(
        <div className="fixed inset-0 z-[9980] bg-pitch flex flex-col">
            {/* Spacer — gerçek Chat ile aynı safe-area deseni */}
            <div className="bg-slate-900 w-full flex-shrink-0 pt-safe-top" />

            {/* HEADER — gerçek maç sohbeti başlığının replikası */}
            <div className="bg-slate-900/90 backdrop-blur p-4 border-b border-slate-800 flex items-center gap-3 shadow-lg">
                <button
                    onClick={requestTourSkipConfirm}
                    className="p-2 -ml-2 rounded-full text-slate-400"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <img src="/icon.png" alt={DEMO_TEAM.name} className="w-10 h-10 rounded-xl bg-slate-800 object-contain p-1" />
                <div className="flex-1 min-w-0">
                    <h2 className="text-white font-bold leading-tight text-sm sm:text-base truncate">
                        {DEMO_TEAM.name} (Kendi Aramızda)
                    </h2>
                    <div className="flex flex-col text-[10px] sm:text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1 text-turf-500 font-medium">
                            <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            14 Oyuncu Aktif
                        </span>
                        {statusInfo && (
                            <span className={`font-semibold ${statusInfo.textColor} leading-none mt-0.5`}>{statusInfo.label}</span>
                        )}
                    </div>
                </div>
                <div data-tour-id="demo-chat-status" className="flex items-center">
                    <MatchStatusBadge reservation={reservation} size="md" />
                </div>
                <button className="p-2 text-slate-400 rounded-full">
                    <MoreVertical className="w-6 h-6" />
                </button>
            </div>

            {/* MESAJLAR */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-6 bg-pitch">
                <div className="flex justify-center">
                    <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide mt-6">
                        Maç Grubu Oluşturuldu
                    </span>
                </div>

                {/* Sistem mesajları — MessageBubble'ın isSystem stiliyle birebir */}
                <div className="flex justify-center my-4 animate-fade-in px-4 w-full">
                    <div className="bg-slate-800/95 border border-slate-700 text-slate-200 text-sm font-medium px-6 py-4 rounded-xl text-center w-full shadow-lg whitespace-pre-wrap">
                        <SystemMessageRenderer
                            text={'{{CLIPBOARD}} Maç ilanı oluşturuldu!\n{{STADIUM}} Dimli Halı Saha — Ana Saha\n{{CLOCK}} 20:00 - 21:00\n{{SHIELD}} Kendi Aramızda'}
                        />
                    </div>
                </div>

                <div data-tour-id="demo-chat-system" className="flex justify-center my-4 animate-fade-in px-4 w-full">
                    <div className="bg-slate-800/95 border border-slate-700 text-slate-200 text-sm font-medium px-6 py-4 rounded-xl text-center w-full shadow-lg whitespace-pre-wrap">
                        <SystemMessageRenderer
                            text={'{{CLOCK}} Rezervasyonun işletme onayı bekliyor. Maçı kesinleştirmek için işletmeyi arayıp teyit etmen gerekir. Onaylandığında maç durumu "Kesinleşti" olarak güncellenecek. {{CHECK}}'}
                        />
                    </div>
                </div>

                {/* Dummy oyuncu mesajları — MessageBubble other-user sınıf reçetesiyle elle
                    çizilir (gerçek bileşen native long-press dinleyicileri taşır, kullanılmaz).
                    Tur adımı: "Maçtan önce arkadaşlarınla maçın hikayesini burada yaz." */}
                <div data-tour-id="demo-chat-messages" className="space-y-2">
                    <div className="flex items-end gap-2 justify-start">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shrink-0">O</div>
                        <div className="max-w-[75%]">
                            <div className="px-3 py-2 rounded-2xl rounded-bl-sm text-sm leading-relaxed shadow-sm bg-slate-800 text-slate-200 border border-slate-700">
                                <span className="text-[11px] font-semibold text-turf-400 block mb-0.5 whitespace-nowrap">Oyuncu 1</span>
                                Kadro tamam, 20:00'de sahadayız! ⚽
                            </div>
                        </div>
                    </div>
                    <div className="flex items-end gap-2 justify-start">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shrink-0">O</div>
                        <div className="max-w-[75%]">
                            <div className="px-3 py-2 rounded-2xl rounded-bl-sm text-sm leading-relaxed shadow-sm bg-slate-800 text-slate-200 border border-slate-700">
                                <span className="text-[11px] font-semibold text-turf-400 block mb-0.5 whitespace-nowrap">Oyuncu 2</span>
                                Formalar bende, erken gelin 💪
                                <span className="text-[10px] block mt-1 text-left text-slate-500">19:42</span>
                            </div>
                        </div>
                    </div>

                    {/* Kapanış hatırlatması — kullanıcı isteği: değerlendirme alışkanlığı */}
                    <div className="flex justify-center pt-2 animate-fade-in px-4 w-full">
                        <div className="bg-slate-800/95 border border-slate-700 text-slate-200 text-sm font-medium px-6 py-3 rounded-xl text-center w-full shadow-lg">
                            <SystemMessageRenderer text={'{{PARTY}} Maçtan sonra işletmeyi değerlendirmeyi unutma!'} />
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER — devre dışı mesaj alanı */}
            <div className="bg-slate-900 border-t border-slate-800 p-3 pb-safe-bottom">
                <div className="bg-slate-800 border border-slate-700 text-slate-500 text-sm rounded-full px-4 py-3 text-center">
                    Tanıtım sohbeti — mesaj gönderilemez
                </div>
            </div>
        </div>,
        document.body
    );
};
