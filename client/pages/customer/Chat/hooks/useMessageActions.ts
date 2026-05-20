import { useState, useEffect, useCallback } from 'react';
import { blockUser, getBlockedUserIds } from '../../../../services/userBlocksService';
import { reportUser } from '../../../../services/userReportsService';

export interface ActionMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
}

export interface MenuPosition {
    x: number;
    y: number;
}

interface Toast {
    text: string;
    type: 'success' | 'error';
}

export const useMessageActions = () => {
    // ── User action modal (Engelle / Şikayet / Engelle+Şikayet) ──────────────
    const [selectedMessage, setSelectedMessage] = useState<ActionMessage | null>(null);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [blockAndReportPending, setBlockAndReportPending] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // ── Context menu (Kopyala / Bildir) ──────────────────────────────────────
    const [contextMenuMsg, setContextMenuMsg] = useState<ActionMessage | null>(null);
    const [contextMenuPosition, setContextMenuPosition] = useState<MenuPosition>({ x: 0, y: 0 });
    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

    // ── Blocked IDs + toast ───────────────────────────────────────────────────
    const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
    const [toast, setToast] = useState<Toast | null>(null);

    useEffect(() => {
        getBlockedUserIds().then(setBlockedUserIds).catch(() => {});
    }, []);

    const showToast = useCallback((text: string, type: Toast['type']) => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    // ── Context menu ─────────────────────────────────────────────────────────

    const openContextMenu = useCallback((msg: ActionMessage, position: MenuPosition) => {
        setContextMenuMsg(msg);
        setContextMenuPosition(position);
        setIsContextMenuOpen(true);
    }, []);

    const closeContextMenu = useCallback(() => {
        setIsContextMenuOpen(false);
        setContextMenuMsg(null);
    }, []);

    const handleCopy = useCallback(async () => {
        if (!contextMenuMsg) return;
        try {
            await navigator.clipboard.writeText(contextMenuMsg.text);
            showToast('Mesaj kopyalandı.', 'success');
        } catch {
            showToast('Kopyalama başarısız.', 'error');
        }
        closeContextMenu();
    }, [contextMenuMsg, showToast, closeContextMenu]);

    // "Bildir" tıklanınca: context menu kapanır, action modal açılır
    const handleContextMenuReport = useCallback(() => {
        if (!contextMenuMsg) return;
        setSelectedMessage(contextMenuMsg);
        setIsContextMenuOpen(false);
        setContextMenuMsg(null);
        setIsActionModalOpen(true);
    }, [contextMenuMsg]);

    // ── User action modal ─────────────────────────────────────────────────────

    // Avatar tıklamasından açılır
    const openActionModal = useCallback((msg: ActionMessage) => {
        setSelectedMessage(msg);
        setIsActionModalOpen(true);
    }, []);

    const closeAll = useCallback(() => {
        setIsActionModalOpen(false);
        setIsReportModalOpen(false);
        setBlockAndReportPending(false);
        setSelectedMessage(null);
        setActionLoading(false);
    }, []);

    const handleBlock = useCallback(async () => {
        if (!selectedMessage) return;
        setActionLoading(true);
        try {
            await blockUser(selectedMessage.senderId);
            setBlockedUserIds(prev => [...prev, selectedMessage.senderId]);
            showToast(`${selectedMessage.senderName} kullanıcısının mesajlarını artık görmeyeceksiniz.`, 'success');
            closeAll();
        } catch {
            showToast('Engelleme başarısız. Tekrar deneyin.', 'error');
            setActionLoading(false);
        }
    }, [selectedMessage, showToast, closeAll]);

    const openReportModal = useCallback(() => {
        setIsActionModalOpen(false);
        setIsReportModalOpen(true);
    }, []);

    const handleBlockAndReport = useCallback(async () => {
        if (!selectedMessage) return;
        setActionLoading(true);
        try {
            await blockUser(selectedMessage.senderId);
            setBlockedUserIds(prev => [...prev, selectedMessage.senderId]);
        } catch {
            // engel başarısız olsa da şikayet akışı devam eder
        } finally {
            setActionLoading(false);
        }
        setBlockAndReportPending(true);
        setIsActionModalOpen(false);
        setIsReportModalOpen(true);
    }, [selectedMessage]);

    const handleReport = useCallback(async (channelId: string | undefined, note: string) => {
        if (!selectedMessage) return;
        setActionLoading(true);
        try {
            await reportUser({
                reportedUserId: selectedMessage.senderId,
                messageId: selectedMessage.id,
                channelId,
                note: note || undefined,
            });
            showToast(
                blockAndReportPending
                    ? 'Kullanıcı engellendi ve şikayetiniz iletildi.'
                    : 'Şikayetiniz iletildi.',
                'success',
            );
            closeAll();
        } catch {
            showToast('Şikayet gönderilemedi. Tekrar deneyin.', 'error');
            setActionLoading(false);
        }
    }, [selectedMessage, blockAndReportPending, showToast, closeAll]);

    // ── Message filter ────────────────────────────────────────────────────────

    const filterMessage = useCallback((msg: { senderId?: string | null; isSystem?: boolean }) => {
        if (msg.isSystem || !msg.senderId) return true;
        return !blockedUserIds.includes(msg.senderId);
    }, [blockedUserIds]);

    return {
        // context menu
        isContextMenuOpen, contextMenuMsg, contextMenuPosition,
        openContextMenu, closeContextMenu, handleCopy, handleContextMenuReport,
        // action modal
        selectedMessage, isActionModalOpen, isReportModalOpen,
        blockAndReportPending, actionLoading,
        openActionModal, openReportModal, handleBlock,
        handleBlockAndReport, handleReport, closeAll,
        // shared
        toast, filterMessage,
    };
};
