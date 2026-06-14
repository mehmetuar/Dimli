import { useEffect, useState, useCallback } from 'react';
import adminApi from '../../../services/adminApi';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface PitchApproval {
    id: string;
    name: string;
    description?: string;
    type: string;
    pricePerHour: number;
    imageUrl?: string;
    openTime?: string;
    closeTime?: string;
    facilities?: string[];
    closedDays?: string[];
    timeSlots?: { startTime: string; endTime: string }[];
    approvalStatus: ApprovalStatus;
    rejectionReason?: string;
    createdAt: string;
    reviewedAt?: string;
    businessId: string;
    businessName?: string;
}

export const usePitchApprovals = () => {
    const [pitches, setPitches] = useState<PitchApproval[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<ApprovalStatus>('pending');
    const [selectedPitch, setSelectedPitch] = useState<PitchApproval | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [processing, setProcessing] = useState(false);

    const fetchPitches = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminApi.get(`/admin/pitch-approvals?status=${statusFilter}`);
            setPitches(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { fetchPitches(); }, [fetchPitches]);

    const handleApprove = async (id: string) => {
        setProcessing(true);
        try {
            await adminApi.post(`/admin/pitch-approvals/${id}/approve`);
            setSelectedPitch(null);
            await fetchPitches();
        } catch (err) {
            console.error(err);
            alert('Onaylama sırasında hata oluştu.');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (id: string) => {
        if (!rejectReason.trim()) {
            alert('Red sebebi boş olamaz.');
            return;
        }
        setProcessing(true);
        try {
            await adminApi.post(`/admin/pitch-approvals/${id}/reject`, { reason: rejectReason.trim() });
            setSelectedPitch(null);
            setRejectReason('');
            setShowRejectInput(false);
            await fetchPitches();
        } catch (err) {
            console.error(err);
            alert('Reddetme sırasında hata oluştu.');
        } finally {
            setProcessing(false);
        }
    };

    const openPitch = (pitch: PitchApproval) => {
        setSelectedPitch(pitch);
        setShowRejectInput(false);
        setRejectReason('');
    };

    const closePitch = () => {
        setSelectedPitch(null);
        setShowRejectInput(false);
        setRejectReason('');
    };

    return {
        pitches, loading, statusFilter, setStatusFilter,
        selectedPitch, openPitch, closePitch,
        rejectReason, setRejectReason,
        showRejectInput, setShowRejectInput,
        processing,
        handleApprove, handleReject,
    };
};
