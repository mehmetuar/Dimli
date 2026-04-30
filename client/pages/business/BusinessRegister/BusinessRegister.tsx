import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { LocationSelectionModal } from '../../../components/Modals/LocationSelectionModal';
import { BusinessTimePickerModal } from '../../../components/Modals/BusinessTimePickerModal';

import { useBusinessRegister } from './hooks/useBusinessRegister';
import { RegisterSidebar, steps } from './components/RegisterSidebar';
import { useKeyboardHeight } from '../../../utils/useKeyboardHeight';

import { WelcomeStep } from './components/steps/WelcomeStep';
import { OwnerInfoStep } from './components/steps/OwnerInfoStep';
import { OtpVerificationStep } from './components/steps/OtpVerificationStep';
import { BusinessDetailsStep } from './components/steps/BusinessDetailsStep';
import { LocationStep } from './components/steps/LocationStep';
import { PitchesAndPlanStep } from './components/steps/PitchesAndPlanStep';
import { PaymentStep } from './components/steps/PaymentStep';
import { CongratulationsStep } from './components/steps/CongratulationsStep';

export const BusinessRegister: React.FC = () => {
    const keyboardHeight = useKeyboardHeight();
    const {
        currentStep, totalSteps,
        error, isLoading,
        isGeocoding, setIsGeocoding,
        isLocationModalOpen, setIsLocationModalOpen,
        locationModalStep, setLocationModalStep,
        isTimePickerOpen, setIsTimePickerOpen,
        tempSlot, setTempSlot,
        formData,
        otpSent, otpSending, otpCode, setOtpCode,
        updateOwner, updateBusiness, updatePitch,
        setPitchCount, toggleFacility, addTimeSlot, removeTimeSlot,
        sendOtp, verifyOtp,
        handleSubmit, nextStep, prevStep,
    } = useBusinessRegister();

    const isLastInputStep = currentStep === 7;
    const isCongratsStep = currentStep === 8;
    const isWelcomeStep = currentStep === 1;
    const isOtpStep = currentStep === 3;
    const hideHeader = isCongratsStep || isWelcomeStep;

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return <WelcomeStep />;
            case 2:
                return <OwnerInfoStep formData={formData} updateOwner={updateOwner} />;
            case 3:
                return (
                    <OtpVerificationStep
                        phone={formData.owner.phone}
                        otpCode={otpCode}
                        setOtpCode={setOtpCode}
                        otpSending={otpSending}
                        isLoading={isLoading}
                        onVerify={verifyOtp}
                        onResend={sendOtp}
                    />
                );
            case 4:
                return (
                    <BusinessDetailsStep
                        formData={formData}
                        updateBusiness={updateBusiness}
                        setIsTimePickerOpen={setIsTimePickerOpen}
                    />
                );
            case 5:
                return (
                    <LocationStep
                        formData={formData}
                        updateBusiness={updateBusiness}
                        isGeocoding={isGeocoding}
                        setIsGeocoding={setIsGeocoding}
                    />
                );
            case 6:
                return (
                    <PitchesAndPlanStep
                        formData={formData}
                        updatePitch={updatePitch}
                        setPitchCount={setPitchCount}
                        setIsTimePickerOpen={setIsTimePickerOpen}
                        removeTimeSlot={removeTimeSlot}
                        tempSlot={tempSlot}
                        addTimeSlot={addTimeSlot}
                        toggleFacility={toggleFacility}
                    />
                );
            case 7:
                return <PaymentStep formData={formData} isLoading={isLoading} error={error} onSubmit={handleSubmit} />;
            case 8:
                return <CongratulationsStep ownerEmail={formData.owner.email} />;
            default:
                return null;
        }
    };

    return (
        <div
            className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center p-3 md:p-4"
            style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 12 : undefined }}
        >
            <div className="w-full max-w-4xl bg-slate-900 rounded-2xl md:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[580px] md:min-h-[600px]">

                <RegisterSidebar currentStep={currentStep} />

                <div className="flex-1 flex flex-col p-5 md:p-10 relative">
                    {/* Header — welcome ve tamamlandı adımında gizle */}
                    {!hideHeader && (
                        <div className="flex justify-between items-center mb-5 md:mb-6">
                            <h2 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-wider">
                                {steps.find(s => s.id === currentStep)?.title}
                            </h2>
                            <span className="text-slate-500 text-xs md:text-sm font-bold">
                                {currentStep < 8 ? `Adım ${currentStep} / 7` : ''}
                            </span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-4 text-sm font-bold">
                            {error}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide pb-24">
                        {renderStepContent()}
                    </div>

                    {/* Navigation — OTP, payment, congrats adımlarında farklı davranış */}
                    {!isCongratsStep && !isLastInputStep && !isOtpStep && (
                        <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-5 md:px-10 py-4 border-t border-slate-800 bg-slate-900 z-10">
                            <button
                                onClick={prevStep}
                                disabled={currentStep === 1}
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-colors min-h-[44px] ${
                                    currentStep === 1
                                        ? 'text-slate-700 cursor-not-allowed'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                <ChevronLeft size={20} /> Geri
                            </button>

                            <button
                                onClick={nextStep}
                                disabled={isLoading}
                                className="bg-white text-slate-900 px-7 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-slate-200 transition-colors shadow-lg shadow-white/10 disabled:opacity-50 min-h-[44px]"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <>İleri <ChevronRight size={20} /></>}
                            </button>
                        </div>
                    )}

                    {/* OTP adımında sadece geri butonu */}
                    {isOtpStep && (
                        <div className="absolute bottom-0 left-0 right-0 px-5 md:px-10 py-4 border-t border-slate-800 bg-slate-900 z-10">
                            <button
                                onClick={prevStep}
                                className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-h-[44px]"
                            >
                                <ChevronLeft size={20} /> Geri
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {!isCongratsStep && (
                <div className="mt-5 text-center">
                    <p className="text-slate-500 text-sm">
                        Zaten hesabın var mı?{' '}
                        <Link to="/business/login" className="text-orange-500 font-bold hover:underline">
                            Giriş Yap
                        </Link>
                    </p>
                </div>
            )}

            <LocationSelectionModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                onSelect={(city, dist) => {
                    updateBusiness('city', city);
                    updateBusiness('district', dist);
                }}
                initialCity={formData.business.city}
                initialDistrict={formData.business.district}
                initialStep={locationModalStep}
            />

            <BusinessTimePickerModal
                isOpen={isTimePickerOpen.open}
                onClose={() => setIsTimePickerOpen({ ...isTimePickerOpen, open: false })}
                title={
                    isTimePickerOpen.type === 'OPEN' ? "İŞLETME AÇILIŞ" :
                        isTimePickerOpen.type === 'CLOSE' ? "İŞLETME KAPANIŞ" :
                            isTimePickerOpen.type === 'PITCH_OPEN' ? "SAHA AÇILIŞ" :
                                isTimePickerOpen.type === 'PITCH_CLOSE' ? "SAHA KAPANIŞ" :
                                    isTimePickerOpen.type === 'SLOT_START' ? "SLOT BAŞLANGIÇ" : "SLOT BİTİŞ"
                }
                initialTime={
                    isTimePickerOpen.type === 'OPEN' ? formData.business.openTime :
                        isTimePickerOpen.type === 'CLOSE' ? formData.business.closeTime :
                            isTimePickerOpen.pitchIdx !== undefined ? (
                                isTimePickerOpen.type === 'PITCH_OPEN' ? formData.pitches[isTimePickerOpen.pitchIdx]?.openTime :
                                    isTimePickerOpen.type === 'PITCH_CLOSE' ? formData.pitches[isTimePickerOpen.pitchIdx]?.closeTime :
                                        isTimePickerOpen.type === 'SLOT_START' ? tempSlot.startTime : tempSlot.endTime
                            ) : '19:00'
                }
                onSelect={(time) => {
                    if (isTimePickerOpen.type === 'OPEN') updateBusiness('openTime', time);
                    else if (isTimePickerOpen.type === 'CLOSE') updateBusiness('closeTime', time);
                    else if (isTimePickerOpen.pitchIdx !== undefined) {
                        if (isTimePickerOpen.type === 'PITCH_OPEN') updatePitch(isTimePickerOpen.pitchIdx, 'openTime', time);
                        else if (isTimePickerOpen.type === 'PITCH_CLOSE') updatePitch(isTimePickerOpen.pitchIdx, 'closeTime', time);
                        else if (isTimePickerOpen.type === 'SLOT_START') setTempSlot(s => ({ ...s, startTime: time }));
                        else if (isTimePickerOpen.type === 'SLOT_END') setTempSlot(s => ({ ...s, endTime: time }));
                    }
                }}
            />
        </div>
    );
};
