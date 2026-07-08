import { useState } from 'react';
import adminApi from '../../../services/adminApi';
import { usePaginatedList } from '../../../hooks/usePaginatedList';

type RequestType = 'CUSTOM_FACILITY' | 'PHOTO_UPDATE' | 'BUSINESS_PHOTO_UPDATE';
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
    // BUSINESS_PHOTO_UPDATE isteklerinde pitch alanları null (istek işletmeye ait)
    pitchId: string | null;
    pitchName?: string | null;
    businessId: string;
    businessName?: string;
}

export const useChangeRequests = () => {
    const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('pending');
    const effectiveStatus = statusFilter === 'all' ? 'pending' : statusFilter;

    const {
        items: requests, total, totalPages, page, setPage,
        search, setSearch, loading, refetch,
    } = usePaginatedList<ChangeRequest>('/admin/change-requests', { status: effectiveStatus });

    const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [processing, setProcessing] = useState(false);

    const handleApprove = async (id: string) => {
        setProcessing(true);
        try {
            await adminApi.post(`/admin/change-requests/${id}/approve`);
            setSelectedRequest(null);
            await refetch();
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
            await refetch();
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
        requests, total, totalPages, page, setPage, search, setSearch,
        loading, statusFilter, setStatusFilter,
        selectedRequest, openRequest, closeRequest,
        rejectReason, setRejectReason,
        showRejectInput, setShowRejectInput,
        processing,
        handleApprove, handleReject,
    };
};
