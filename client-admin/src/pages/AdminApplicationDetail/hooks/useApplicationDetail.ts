import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminApi from '../../../services/adminApi';
import { usePitchEditor } from './usePitchEditor';

export const useApplicationDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [app, setApp] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [editBusiness, setEditBusiness] = useState<Record<string, string>>({});
    const [editOwner, setEditOwner] = useState<Record<string, string>>({});

    const { editPitches, initPitches, updatePitch } = usePitchEditor();

    const initEditState = (data: any) => {
        setEditBusiness({
            name: data.name ?? '',
            city: data.city ?? '',
            district: data.district ?? '',
            address: data.address ?? '',
            openTime: data.openTime ?? '',
            closeTime: data.closeTime ?? '',
        });
        setEditOwner({
            fullName: data.owner?.fullName ?? '',
            email: data.owner?.email ?? '',
            phone: data.owner?.phone ?? '',
        });
        initPitches(data.pitches ?? []);
    };

    useEffect(() => {
        adminApi.get(`/admin/applications/${id}`)
            .then(r => { setApp(r.data); initEditState(r.data); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    const handleCancelEdit = () => { initEditState(app); setEditMode(false); };

    const saveChanges = async (): Promise<boolean> => {
        setActionLoading(true);
        try {
            const body = {
                business: editBusiness,
                owner: editOwner,
                pitches: editPitches.map(p => ({
                    id: p.id,
                    name: p.name,
                    type: p.type,
                    pricePerHour: parseFloat(p.pricePerHour) || undefined,
                    facilities: p.facilities,
                    imageUrl: p.imageUrl,
                    timeSlots: p.timeSlots.map(s => ({
                        id: s.id,
                        startTime: s.startTime,
                        endTime: s.endTime,
                        isActive: s.isActive,
                        _delete: s._delete,
                    })),
                })),
            };
            const res = await adminApi.patch(`/admin/applications/${id}`, body);
            setApp(res.data);
            initEditState(res.data);
            return true;
        } catch (err: any) {
            setMessage({ text: 'Hata: ' + (err.response?.data?.message || 'Değişiklikler kaydedilemedi.'), type: 'error' });
            return false;
        } finally {
            setActionLoading(false);
        }
    };

    const handleSave = async () => {
        const ok = await saveChanges();
        if (ok) { setEditMode(false); setMessage({ text: 'Değişiklikler başarıyla kaydedildi.', type: 'success' }); }
    };

    const handleSaveAndApprove = async () => {
        const ok = await saveChanges();
        if (!ok) return;
        setActionLoading(true);
        try {
            await adminApi.post(`/admin/applications/${id}/approve`);
            setApp((prev: any) => ({ ...prev, status: 'active', reviewedAt: new Date().toISOString() }));
            setEditMode(false);
            setMessage({ text: 'Değişiklikler kaydedildi ve işletme onaylandı.', type: 'success' });
        } catch (err: any) {
            setMessage({ text: 'Hata: ' + (err.response?.data?.message || 'Onaylama başarısız.'), type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const approve = async () => {
        setActionLoading(true);
        try {
            await adminApi.post(`/admin/applications/${id}/approve`);
            setMessage({ text: 'İşletme onaylandı.', type: 'success' });
            setApp((prev: any) => ({ ...prev, status: 'active', reviewedAt: new Date().toISOString() }));
        } catch (err: any) {
            setMessage({ text: 'Hata: ' + (err.response?.data?.message || 'Onaylama başarısız.'), type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const reject = async () => {
        if (!rejectReason.trim()) return;
        setActionLoading(true);
        try {
            await adminApi.post(`/admin/applications/${id}/reject`, { reason: rejectReason });
            setMessage({ text: 'İşletme reddedildi.', type: 'success' });
            setApp((prev: any) => ({ ...prev, status: 'rejected', rejectionReason: rejectReason, reviewedAt: new Date().toISOString() }));
            setShowRejectForm(false);
        } catch (err: any) {
            setMessage({ text: 'Hata: ' + (err.response?.data?.message || 'Reddetme başarısız.'), type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const suspend = async () => {
        setActionLoading(true);
        try {
            await adminApi.post(`/admin/businesses/${id}/suspend`);
            setApp((prev: any) => ({ ...prev, status: 'suspended' }));
            setMessage({ text: 'İşletme askıya alındı.', type: 'success' });
        } catch (err: any) {
            setMessage({ text: 'Hata: ' + (err.response?.data?.message || 'İşlem başarısız.'), type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const activate = async () => {
        setActionLoading(true);
        try {
            await adminApi.post(`/admin/businesses/${id}/activate`);
            setApp((prev: any) => ({ ...prev, status: 'active' }));
            setMessage({ text: 'İşletme aktifleştirildi.', type: 'success' });
        } catch (err: any) {
            setMessage({ text: 'Hata: ' + (err.response?.data?.message || 'İşlem başarısız.'), type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    return {
        app, loading, actionLoading,
        editMode, setEditMode,
        editBusiness, setEditBusiness,
        editOwner, setEditOwner,
        editPitches, updatePitch,
        message, setMessage,
        showRejectForm, setShowRejectForm,
        rejectReason, setRejectReason,
        navigate,
        handleCancelEdit, handleSave, handleSaveAndApprove, approve, reject, suspend, activate,
    };
};
