import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../../../services/api';
import { getOwnerId } from '../../../../services/authStorage';
import { SuccessType } from '../../../../components/Modals/SuccessModal';
import { isPastSlot as isPastSlotShared } from '../../../../utils/nightSlot';
import { listPresetNotes, createPresetNote, PresetNote } from '../../../../services/presetNotes';
import { isNetworkError } from '../../../../utils/apiError';
import { readObjectCache, writeObjectCache, BIZ_DASHBOARD_CACHE_KEY } from '../../../../utils/listCache';
import { useOnReconnect } from '../../../../hooks/useOnReconnect';
import { todayStr, addDaysStr } from '../../../../utils/today';

// Yalnız BUGÜNÜN önbelleği geçerli — dashboard tarih bağımlı; dünkü özet
// bugünmüş gibi gösterilmez. Tarih seçilmişse cache miss (kabul edilir).
const readTodayDashboardCache = () => {
    const cached = readObjectCache<{ date: string; data: any; subscription: any }>(BIZ_DASHBOARD_CACHE_KEY);
    return cached?.date === new Date().toISOString().split('T')[0] ? cached : null;
};

// Seçilen tarihi localStorage'a yaz/oku (FilterContext emsali): işletme kullanıcısı
// takvimden bir gün seçince, kendisi DEĞİŞTİRENE kadar o gün seçili kalsın —
// dashboard'a her dönüşte/uygulama açılışında bugüne resetlenmesin.
const BIZ_DATE_KEY = 'biz_dashboard_selected_date';
const loadBizDate = (): string => { try { return localStorage.getItem(BIZ_DATE_KEY) ?? ''; } catch { return ''; } };
const saveBizDate = (d: string) => { try { localStorage.setItem(BIZ_DATE_KEY, d); } catch {} };

export const useBusinessDashboard = () => {
    const location = useLocation();
    // Saklı tarihi geri yükle. Takvim seçilebilir aralığı [bugün-90, bugün+30]
    // (BusinessDateFilterModal); bu aralık dışındaysa (ör. uygulama 3+ ay kapalı
    // kalmış → takvim o günü artık seçemez) bugüne düş. Aralıktaysa AYNEN koru —
    // geçmiş tarih dahil (işletme paneli geçmişe bakmaya izin verir; kullanıcı
    // "değiştirene kadar kalsın" dedi → bugüne ZORLA çekilmez).
    const [selectedDate, setSelectedDateState] = useState(() => {
        const t = todayStr();
        const stored = loadBizDate();
        if (!stored) return t;
        const min = addDaysStr(new Date(), -90);
        const max = addDaysStr(new Date(), 30);
        return (stored < min || stored > max) ? t : stored; // YYYY-MM-DD leksikografik = kronolojik
    });

    // Dışa verilen setter: ELLE seçim localStorage'a yazılır (kalıcı olur).
    // Deep-link (bildirim) tarihi bunu KULLANMAZ → geçici kalır (aşağıya bakınız).
    const setSelectedDate = useCallback((d: string) => {
        setSelectedDateState(d);
        saveBizDate(d);
    }, []);
    // Stale-while-revalidate: bugünün önbelleği varsa soğuk açılışta anında basılır
    // ("mavi ekran" yerine); arkada normal fetch sürer.
    const [dashboardData, setDashboardData] = useState<any>(() => readTodayDashboardCache()?.data ?? null);

    // Bildirimden "Rezervasyon İsteğine Git" ile gelen slot hedefi: veri o TARİH
    // için yüklendiğinde SlotDetailModal otomatik açılır (date guard'ı, bugünün
    // verisiyle yanlış slot açılmasını önler). focusPitchId PitchGrid'in doğru
    // saha sekmesini seçmesi için.
    const pendingOpenSlotRef = useRef<{ pitchId: string; startTime: string; date: string } | null>(null);
    const [focusPitchId, setFocusPitchId] = useState<string | null>(null);

    const tryOpenPendingSlot = (data: any, dateForData: string) => {
        const pending = pendingOpenSlotRef.current;
        if (!pending || pending.date !== dateForData || !data) return;
        pendingOpenSlotRef.current = null;
        const pitch = (data.pitches || []).find((p: any) => p.pitchId === pending.pitchId);
        const slot = pitch?.slots?.find((s: any) => s.startTime === pending.startTime);
        if (slot) setSelectedSlot({ ...slot, pitchId: pending.pitchId });
        // Slot bulunamazsa (saha/slot kaldırılmış) sessizce sadece tarihte kalınır.
    };

    // Bildirimden gelinen tarihi (+ varsa slot hedefini) uygula (YYYY-MM-DD).
    // Regex guard: legacy tr-TR stringi ('4 Temmuz') yoksayılır ki dashboard
    // sorgusu bozulmasın. Ham setter (setSelectedDateState) kullanılır → bu tarih
    // GEÇİCİDİR, localStorage'a YAZILMAZ: dashboard'a normal dönüşte en son ELLE
    // seçilen tarihe dönülür (yalnız kullanıcının takvim seçimi kalıcıdır).
    useEffect(() => {
        const state = location.state as {
            selectedDate?: string;
            openSlot?: { pitchId: string; startTime: string };
        } | null;
        const incoming = state?.selectedDate;
        if (incoming && /^\d{4}-\d{2}-\d{2}$/.test(incoming)) {
            if (state?.openSlot?.pitchId && state.openSlot.startTime) {
                pendingOpenSlotRef.current = { ...state.openSlot, date: incoming };
                setFocusPitchId(state.openSlot.pitchId);
            }
            setSelectedDateState(incoming);
            window.history.replaceState({}, ''); // geri/yenilemede tekrar tetiklenmesin
            // Tarih zaten seçiliyse yeni fetch tetiklenmez → mevcut veriyle hemen aç.
            if (incoming === selectedDate) tryOpenPendingSlot(dashboardData, incoming);
        }
    }, [location.state]);
    const [subscription, setSubscription] = useState<any>(() => readTodayDashboardCache()?.subscription ?? null);
    const [businessStatus, setBusinessStatus] = useState<string | null>(() => readTodayDashboardCache()?.data?.businessStatus ?? null);
    const [rejectionReason, setRejectionReason] = useState<string | null>(null);
    const [resubmitting, setResubmitting] = useState(false);
    // Önbellek hydrate edildiyse spinner'sız başla; taze veri arkada gelir.
    const [loading, setLoading] = useState(dashboardData === null);
    // Ağ hatası / genel hata ayrımı — boş-durum ekranı "Bağlantı yok + Tekrar Dene"
    // ile "Veri bulunamadı"yı ayırt eder.
    const [loadError, setLoadError] = useState<'network' | 'generic' | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [note, setNote] = useState('');
    const [actionType, setActionType] = useState<'APPROVE' | 'SEND_NOTE' | null>(null);
    const [targetReservationId, setTargetReservationId] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    // Hazır notlar — not modalındaki seçici + "bu notu kaydet" için.
    const [presetNotes, setPresetNotes] = useState<PresetNote[]>([]);
    // Hazır notlar yalnız not modalı ilk açıldığında çekilir (lazy) — mount'ta değil.
    const presetNotesLoadedRef = useRef(false);
    // Subscription tarihten bağımsız → yalnız ilk yükleme + reconnect/resubmit'te
    // çekilir; subscriptionRef cache yazımına en güncel değeri taşır.
    const subscriptionRef = useRef<any>(subscription);
    const subscriptionLoadedRef = useRef(false);

    // UX States
    const [successModal, setSuccessModal] = useState<{ isOpen: boolean; message: string; type: SuccessType }>({
        isOpen: false,
        message: '',
        type: 'DEFAULT'
    });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDangerous?: boolean;
        confirmText?: string;
        cancelText?: string;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const [cancelReservationId, setCancelReservationId] = useState<string | null>(null);

    useEffect(() => {
        fetchDashboard();
    }, [selectedDate]);

    const loadPresetNotes = useCallback(async () => {
        try {
            setPresetNotes(await listPresetNotes());
        } catch (error) {
            console.error('Preset notes fetch error:', error);
        }
    }, []);

    // Not modalındaki metni hazır notlara kaydet. Trim'li dedupe; gönderme akışını
    // etkilemez (sadece presete ekler). Sonuç mesajı modalda inline gösterilir.
    const savePresetFromNote = async (
        content: string,
    ): Promise<{ ok: boolean; message: string }> => {
        const trimmed = content.trim();
        if (!trimmed) return { ok: false, message: 'Önce bir not yazın.' };
        if (presetNotes.some((n) => n.content.trim() === trimmed)) {
            return { ok: false, message: 'Bu not zaten kayıtlı.' };
        }
        try {
            await createPresetNote(trimmed);
            await loadPresetNotes();
            return { ok: true, message: 'Hazır notlara kaydedildi ✓' };
        } catch (error: any) {
            return { ok: false, message: error?.response?.data?.message || 'Kaydedilemedi.' };
        }
    };

    const slotSortMin = (time: string): number => {
        const startStr = time.includes(' - ') ? time.split(' - ')[0] : time;
        const [h, m] = startStr.split(':').map(Number);
        return h * 60 + (m || 0);
    };

    const fetchDashboard = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const ownerId = getOwnerId();
            if (!ownerId) return;

            // Subscription tarihten bağımsız → yalnız ilk yüklemede (veya reconnect/
            // resubmit'te silent=true ile) çek; tarih gezinme + mutasyon sonrası
            // yenilemelerde tekrar çekme (o istek düşer).
            const needSub = !subscriptionLoadedRef.current || silent;
            const [dashboardRes, subRes] = await Promise.all([
                api.get(`/business-owner/dashboard?date=${selectedDate}&ownerId=${ownerId}`),
                needSub
                    ? api.get(`/subscription/owner/${ownerId}`).catch(() => ({ data: null }))
                    : Promise.resolve(null),
            ]);

            const data = dashboardRes.data;
            if (data?.pitches) {
                data.pitches = data.pitches.map((pitch: any) => ({
                    ...pitch,
                    slots: [...(pitch.slots || [])].sort(
                        (a: any, b: any) => slotSortMin(a.time) - slotSortMin(b.time)
                    ),
                }));
            }

            setDashboardData(data);
            setBusinessStatus(data?.businessStatus ?? null);
            setRejectionReason(data?.rejectionReason ?? null);
            if (subRes) {
                setSubscription(subRes.data);
                subscriptionRef.current = subRes.data;
                subscriptionLoadedRef.current = true;
            }
            setLoadError(null);

            // Çevrimdışı açılış için bugünün özeti saklanır (yalnız bugün — tarih
            // bağımlı veri; readTodayDashboardCache aynı guard'la okur). Subscription
            // ayrı çekildiğinden cache'e en güncel değeri (subscriptionRef) yazılır.
            if (selectedDate === new Date().toISOString().split('T')[0]) {
                writeObjectCache(BIZ_DASHBOARD_CACHE_KEY, {
                    date: selectedDate,
                    data,
                    subscription: subscriptionRef.current,
                });
            }

            // Bildirimden gelinen slot hedefi bu tarihin TAZE verisiyle açılır
            // (closure'daki selectedDate = bu fetch'in sorguladığı tarih).
            tryOpenPendingSlot(data, selectedDate);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            setLoadError(isNetworkError(error) ? 'network' : 'generic');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const silentRefetch = useCallback(() => fetchDashboard(true), [selectedDate]);

    // Ağ geri gelince sessiz tazele (banner yeşil onayıyla eşzamanlı).
    useOnReconnect(silentRefetch);

    // Reddedilen işletmeyi tekrar onaya gönder (status rejected -> pending).
    // Body yok; sunucu owner'ı JWT'den çözer ve yalnız 'rejected'tan geçişe izin verir.
    const handleResubmit = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Tekrar Onaya Gönder',
            message: 'Gerekli düzeltmeleri yaptınız mı? İşletmeniz tekrar incelenmek üzere yönetim ekibine gönderilecek.',
            isDangerous: false,
            confirmText: 'Evet, Gönder',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                if (resubmitting) return;
                setResubmitting(true);
                try {
                    await api.patch('/business-owner/business/resubmit');
                    setSuccessModal({
                        isOpen: true,
                        message: 'Başvurunuz tekrar onaya gönderildi. İnceleme 1-2 iş günü sürmektedir.',
                        type: 'DEFAULT'
                    });
                    await fetchDashboard(true);
                } catch (error: any) {
                    console.error('Resubmit error:', error);
                    alert(error.response?.data?.message || 'İşlem başarısız.');
                } finally {
                    setResubmitting(false);
                }
            }
        });
    };

    const isPastSlot = (time: string, date: string): boolean => {
        const startTimeStr = time.includes(' - ') ? time.split(' - ')[0] : time;
        return isPastSlotShared(startTimeStr, date);
    };

    const openActionModal = (type: 'APPROVE' | 'SEND_NOTE', reservationId: string) => {
        // Hazır notları yalnız not modalı ilk açıldığında çek (her dashboard
        // açılışında değil) — mount'taki gereksiz /preset-notes isteği kaldırıldı.
        if (!presetNotesLoadedRef.current) {
            presetNotesLoadedRef.current = true;
            void loadPresetNotes();
        }
        setActionType(type);
        setTargetReservationId(reservationId);
        setNote('');
    };

    const handleCancelClick = (reservationId: string) => {
        setCancelReservationId(reservationId);
    };

    const handleConfirmCancel = async () => {
        if (!cancelReservationId) return;
        try {
            await api.post(`/reservations/${cancelReservationId}/revoke`);
            setSuccessModal({
                isOpen: true,
                message: 'Maç onayı geri alındı ve takımlara bildirildi.',
                type: 'DEFAULT'
            });
            setSelectedSlot(null);
            fetchDashboard();
        } catch (error) {
            console.error('Cancel error:', error);
            alert('İşlem başarısız.');
        } finally {
            setCancelReservationId(null);
        }
    };

    const handleAcceptCancelRequest = async (reservationId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'İptal İsteğini Onayla',
            message: 'İptal isteğini onaylamak istediğinize emin misiniz? Maç iptal edilecektir.',
            isDangerous: true,
            confirmText: 'İptali Onayla',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await api.post(`/reservations/${reservationId}/accept-cancel-request`);
                    setSuccessModal({
                        isOpen: true,
                        message: 'İptal talebi onaylandı. Maç iptal edildi.',
                        type: 'MATCH_CANCELLED'
                    });
                    setSelectedSlot(null);
                    fetchDashboard();
                } catch (error: any) {
                    console.error('Accept cancel error:', error);
                    alert(error.response?.data?.message || 'İşlem başarısız.');
                }
            }
        });
    };

    const handleRejectCancelRequest = async (reservationId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'İptal İsteğini Reddet',
            message: 'İptal isteğini reddetmek istediğinize emin misiniz?',
            isDangerous: false,
            confirmText: 'Reddet',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await api.post(`/reservations/${reservationId}/reject-cancel-request`);
                    setSuccessModal({
                        isOpen: true,
                        message: 'İptal talebi reddedildi.',
                        type: 'DEFAULT'
                    });
                    setSelectedSlot(null);
                    fetchDashboard();
                } catch (error: any) {
                    console.error('Reject cancel error:', error);
                    alert(error.response?.data?.message || 'İşlem başarısız.');
                }
            }
        });
    };

    const handleRejectMatchRequest = (reservationId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Maç İsteğini Reddet',
            message: 'Bu maç isteğini reddetmek istediğinize emin misiniz? Takım bilgilendirilecek ve chat kapatılacaktır.',
            isDangerous: true,
            confirmText: 'Reddet',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await api.post(`/reservations/${reservationId}/reject`);
                    setSuccessModal({
                        isOpen: true,
                        message: 'Maç isteği reddedildi.',
                        type: 'DEFAULT',
                    });
                    setSelectedSlot(null);
                    fetchDashboard();
                } catch (error: any) {
                    console.error('Reject match error:', error);
                    alert(error.response?.data?.message || 'İşlem başarısız.');
                }
            },
        });
    };

    const handleManualFillSlot = async (pitchId: string, slotTime: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Saati Doluya Çevir',
            message: 'Bu saati doluya çevirmek istediğinize emin misiniz? Bekleyen tüm onay talepleri reddedilecek ve rakip arayan ilanlar kaldırılacaktır.',
            isDangerous: true,
            confirmText: 'Saati Kapat',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await api.post(`/reservations/manual-fill`, { pitchId, slotTime });
                    setSuccessModal({
                        isOpen: true,
                        message: 'Saat başarıyla işletme tarafından kapatıldı.',
                        type: 'DEFAULT'
                    });
                    setSelectedSlot(null);
                    fetchDashboard();
                } catch (error: any) {
                    console.error('Manual fill error:', error);
                    alert(error.response?.data?.message || 'İşlem başarısız.');
                }
            }
        });
    };

    const handleRecurringCloseSlot = (pitchId: string, slotTime: string, startTime: string, endTime: string) => {
        const dayName = new Date(selectedDate).toLocaleDateString('tr-TR', { weekday: 'long' });
        setConfirmModal({
            isOpen: true,
            title: 'Saati Sürekli Kapat',
            message: `Her ${dayName} günü ${startTime} - ${endTime} saatini sürekli olarak doluya çevirmek istediğinize emin misiniz? Bu saat artık her hafta otomatik olarak kapalı görünecektir.`,
            isDangerous: true,
            confirmText: 'Sürekli Kapat',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await api.post(`/reservations/recurring-closures`, { pitchId, slotTime, startTime, endTime });
                    setSuccessModal({
                        isOpen: true,
                        message: 'Saat sürekli kapatıldı. Her hafta otomatik olarak kapalı görünecek.',
                        type: 'DEFAULT'
                    });
                    setSelectedSlot(null);
                    fetchDashboard();
                } catch (error: any) {
                    console.error('Recurring close error:', error);
                    alert(error.response?.data?.message || 'İşlem başarısız.');
                }
            }
        });
    };

    const handleRemoveRecurringClosure = (recurringClosureId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Sürekli Kapatmayı Kaldır',
            message: 'Bu saatin sürekli kapatma kuralını tamamen kaldırmak istediğinize emin misiniz? Önümüzdeki tüm haftalarda bu saat tekrar boşa çıkacaktır.',
            isDangerous: true,
            confirmText: 'Kuralı Kaldır',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await api.delete(`/reservations/recurring-closures/${recurringClosureId}`);
                    setSuccessModal({
                        isOpen: true,
                        message: 'Sürekli kapatma kuralı kaldırıldı.',
                        type: 'DEFAULT'
                    });
                    setSelectedSlot(null);
                    fetchDashboard();
                } catch (error: any) {
                    console.error('Remove recurring closure error:', error);
                    alert(error.response?.data?.message || 'İşlem başarısız.');
                }
            }
        });
    };

    const handleTransaction = async () => {
        if (!targetReservationId || !actionType || processing) return;

        setProcessing(true);
        try {
            if (actionType === 'APPROVE') {
                await api.post(`/reservations/${targetReservationId}/approve`, { note });
                setSuccessModal({
                    isOpen: true,
                    message: 'Maç başarıyla onaylandı ve takımlara bildirildi.',
                    type: 'MATCH_APPROVED'
                });
                setSelectedSlot(null);
                fetchDashboard();
            } else if (actionType === 'SEND_NOTE') {
                await api.post(`/reservations/${targetReservationId}/business-note`, { note });
                setSuccessModal({
                    isOpen: true,
                    message: 'Mesajınız takımlara iletildi.',
                    type: 'MESSAGE_SENT'
                });
            }

            setTargetReservationId(null);
            setActionType(null);
            setNote('');
        } catch (error: any) {
            console.error('Transaction error:', error);
            const serverMsg: string = error.response?.data?.message || '';
            if (serverMsg.includes('beklemede') || serverMsg.includes('onaylanabilir')) {
                alert('Bu rezervasyon zaten onaylanmış.');
            } else {
                alert(`HATA: ${serverMsg || 'İşlem başarısız oldu.'}`);
            }
        } finally {
            setProcessing(false);
        }
    };

    return {
        selectedDate,
        setSelectedDate,
        focusPitchId,
        dashboardData,
        subscription,
        businessStatus,
        rejectionReason,
        resubmitting,
        handleResubmit,
        loading,
        loadError,
        fetchDashboard,
        selectedSlot,
        setSelectedSlot,
        showDatePicker,
        setShowDatePicker,
        note,
        setNote,
        actionType,
        setActionType,
        targetReservationId,
        setTargetReservationId,
        successModal,
        setSuccessModal,
        confirmModal,
        setConfirmModal,
        cancelReservationId,
        setCancelReservationId,
        isPastSlot,
        openActionModal,
        handleCancelClick,
        handleConfirmCancel,
        handleAcceptCancelRequest,
        handleRejectCancelRequest,
        handleRejectMatchRequest,
        handleTransaction,
        handleManualFillSlot,
        handleRecurringCloseSlot,
        handleRemoveRecurringClosure,
        processing,
        silentRefetch,
        presetNotes,
        savePresetFromNote,
    };
};
