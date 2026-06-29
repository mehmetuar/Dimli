import React from 'react';
import { IconClock, IconX, IconTrash } from '../../components/Icons';
import { useApplicationDetail } from './hooks/useApplicationDetail';
import ApplicationHeader from './components/ApplicationHeader';
import OwnerInfoSection from './components/OwnerInfoSection';
import BusinessInfoSection from './components/BusinessInfoSection';
import BusinessLocationSection from './components/BusinessLocationSection';
import PitchList from './components/PitchList';
import ApplicationActions from './components/ApplicationActions';
import ReviewHistorySection from './components/ReviewHistorySection';
import Section from './components/Section';

export default function AdminApplicationDetail() {
    const {
        app, loading, actionLoading,
        editMode, setEditMode,
        editBusiness, setEditBusiness,
        editOwner, setEditOwner,
        editPitches, updatePitch,
        message, setMessage,
        showRejectForm, setShowRejectForm,
        rejectReason, setRejectReason,
        navigate,
        handleCancelEdit, handleSave, handleSaveAndApprove, approve, reject, suspend, activate, restore,
    } = useApplicationDetail();

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
                <IconClock size={16} className="animate-spin" />
                Yükleniyor...
            </div>
        </div>
    );

    if (!app) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-slate-400 text-sm">Başvuru bulunamadı.</div>
        </div>
    );

    const isPending = app.status === 'pending';
    const isActive = app.status === 'active';
    const isSuspended = app.status === 'suspended';
    const isDeleted = !!app.deletedAt;

    return (
        <div className="min-h-screen p-6 max-w-4xl mx-auto">
            <ApplicationHeader
                app={app}
                editMode={editMode}
                setEditMode={setEditMode}
                actionLoading={actionLoading}
                message={message}
                setMessage={setMessage}
                handleCancelEdit={handleCancelEdit}
                handleSave={handleSave}
                navigate={navigate}
            />

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {app.owner && (
                        <OwnerInfoSection
                            editOwner={editOwner}
                            setEditOwner={setEditOwner}
                            editMode={editMode}
                        />
                    )}
                    <BusinessInfoSection
                        editBusiness={editBusiness}
                        setEditBusiness={setEditBusiness}
                        editMode={editMode}
                    />
                </div>

                <BusinessLocationSection app={app} />

                <PitchList
                    pitches={app.pitches}
                    editPitches={editPitches}
                    editMode={editMode}
                    updatePitch={updatePitch}
                />

                {app.rejectionReason && (
                    <Section title="Red Nedeni" icon={<IconX size={13} />}>
                        <p className="text-red-300 text-sm">{app.rejectionReason}</p>
                    </Section>
                )}

                {app.reviewHistory && app.reviewHistory.length > 0 && (
                    <ReviewHistorySection history={app.reviewHistory} createdAt={app.createdAt} />
                )}

                {isDeleted && (
                    <Section title="Silinmiş İşletme" icon={<IconTrash size={13} />}>
                        <div className="space-y-1.5 text-sm">
                            <p className="text-[#7b9ab8]">
                                Silinme: <span className="text-[#dde8f5]">{new Date(app.deletedAt).toLocaleString('tr-TR')}</span>
                                {app.deletedBy && (
                                    <span className="text-slate-500"> · {app.deletedBy === 'owner' ? 'Sahip tarafından' : 'Admin tarafından'}</span>
                                )}
                            </p>
                            {app.deletionReason && (
                                <p className="text-[#7b9ab8]">Neden: <span className="text-[#dde8f5]">{app.deletionReason}</span></p>
                            )}
                            {app.deletionNote && (
                                <p className="text-[#7b9ab8]">Not: <span className="text-[#dde8f5]">{app.deletionNote}</span></p>
                            )}
                            {(app.ownerNameSnapshot || app.ownerEmailSnapshot || app.ownerPhoneSnapshot) ? (
                                <p className="text-[#7b9ab8]">
                                    Arşivlenen sahip: <span className="text-[#dde8f5]">
                                        {app.ownerNameSnapshot}
                                        {app.ownerEmailSnapshot ? ` · ${app.ownerEmailSnapshot}` : ''}
                                        {app.ownerPhoneSnapshot ? ` · ${app.ownerPhoneSnapshot}` : ''}
                                    </span>
                                </p>
                            ) : (
                                <p className="text-slate-500 italic">Sahip bilgisi arşivlenmemiş (eski silme).</p>
                            )}
                            <p className="text-amber-300/80 text-xs mt-2">
                                Geri yükleme yalnızca işletme verisini geri getirir. Sahip hesabı silindiği için
                                sahibin yeniden kayıt olması gerekir.
                            </p>
                        </div>
                    </Section>
                )}

                <ApplicationActions
                    editMode={editMode}
                    isPending={isPending}
                    isActive={isActive}
                    isSuspended={isSuspended}
                    isDeleted={isDeleted}
                    actionLoading={actionLoading}
                    showRejectForm={showRejectForm}
                    setShowRejectForm={setShowRejectForm}
                    rejectReason={rejectReason}
                    setRejectReason={setRejectReason}
                    handleSave={handleSave}
                    handleSaveAndApprove={handleSaveAndApprove}
                    approve={approve}
                    reject={reject}
                    suspend={suspend}
                    activate={activate}
                    restore={restore}
                />
            </div>
        </div>
    );
}
