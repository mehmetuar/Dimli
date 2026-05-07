import React from 'react';
import { IconClock, IconX } from '../../components/Icons';
import { useApplicationDetail } from './hooks/useApplicationDetail';
import ApplicationHeader from './components/ApplicationHeader';
import OwnerInfoSection from './components/OwnerInfoSection';
import BusinessInfoSection from './components/BusinessInfoSection';
import BusinessLocationSection from './components/BusinessLocationSection';
import PitchList from './components/PitchList';
import ApplicationActions from './components/ApplicationActions';
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
        handleCancelEdit, handleSave, handleSaveAndApprove, approve, reject,
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

                <ApplicationActions
                    editMode={editMode}
                    isPending={isPending}
                    actionLoading={actionLoading}
                    showRejectForm={showRejectForm}
                    setShowRejectForm={setShowRejectForm}
                    rejectReason={rejectReason}
                    setRejectReason={setRejectReason}
                    handleSave={handleSave}
                    handleSaveAndApprove={handleSaveAndApprove}
                    approve={approve}
                    reject={reject}
                />
            </div>
        </div>
    );
}
