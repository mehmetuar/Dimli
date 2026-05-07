import { useEffect, useState, useCallback } from 'react';
import adminApi from '../../../services/adminApi';

type RequestType = 'CUSTOM_FACILITY' | 'PHOTO_UPDATE';
type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface ChangeRequest {
    id: string;
    type: RequestType;
    status: RequestStatus;
    requestedData: any;
    currentData: any;
    rejectionReason?: string;
    createdAt: string;
    reviewedAt?: string;
    pitchId: string;
    pitchName?: string;
    businessId: string;
    businessName?: string;
}

export const useChangeRequests = () => {
    const [requests, setRequests] = useState<ChangeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('pending');
    const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [processing, setProcessing] = useState(false);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '?status=pending';
            const res = await adminApi.get(`/admin/change-requests${params}`);
            setRequests(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const handleApprove = async (id: string) => {
        setProcessing(true);
        try {
            await adminApi.post(`/admin/change-requests/${id}/approve`);
            setSelectedRequest(null);
            await fetchRequests();
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
            await adminApi.post(`/admin/change-requests/${id}/reject`, { reason: rejectReason.trim() });
            setSelectedRequest(null);
            setRejectReason('');
            setShowRejectInput(false);
            await fetchRequests();
        } catch (err) {
            console.error(err);
            alert('Reddetme sırasında hata oluştu.');
        } finally {
            setProcessing(false);
        }
    };

    const openRequest = (req: ChangeRequest) => {
        setSelectedRequest(req);
        setShowRejectInput(false);
        setRejectReason('');
    };

    const closeRequest = () => {
        setSelectedRequest(null);
        setShowRejectInput(false);
        setRejectReason('');
    };

    return {
        requests, loading, statusFilter, setStatusFilter,
        selectedRequest, openRequest, closeRequest,
        rejectReason, setRejectReason,
        showRejectInput, setShowRejectInput,
        processing,
        handleApprove, handleReject,
    };
};
