import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Check } from 'lucide-react';
import { LottiePlayer } from '../../../components/UI/LottiePlayer';
import { AuthWizardLayout } from '../../../components/Layout/AuthWizardLayout';
import { LocationSelectionModal } from './components/LocationSelectionModal';
import { BusinessTimePickerModal } from '../../../components/Modals/BusinessTimePickerModal';

import { useBusinessRegister } from './hooks/useBusinessRegister';

import { WelcomeStep } from './components/steps/WelcomeStep';
import { OwnerInfoStep } from './components/steps/OwnerInfoStep';
import { OtpVerificationStep } from './components/steps/OtpVerificationStep';
import { BusinessDetailsStep } from './components/steps/BusinessDetailsStep';
import { LocationStep } from './components/steps/LocationStep';
import { PitchesAndPlanStep } from './components/steps/PitchesAndPlanStep';
import { PaymentStep } from './components/steps/PaymentStep';
import { CongratulationsStep } from './components/steps/CongratulationsStep';

// Adım 1-7 sayaç/progress dahilinde; adım 8 (Tebrikler) kendi tam-ekran başarı görünümünde.
const TOTAL_STEPS = 7;

const STEP_META: { title: string; subtitle: string }[] = [
    { title: 'Hoş Geldiniz', subtitle: 'Sahanı Dimli’ye taşı — ilk 3 ay ücretsiz' },
    { title: 'Hesap Bilgileri', subtitle: 'İşletme sahibi hesabını oluştur' },
    { title: 'Telefon Doğrulama', subtitle: '' }, // subtitle dinamik (maskeli telefon)
    { title: 'İşletme Bilgileri', subtitle: 'Adı, çalışma saatleri ve kapak fotoğrafı' },
    { title: 'Konum', subtitle: 'İşletmenin haritadaki yerini seç' },
    { title: 'Sahalar & Plan', subtitle: 'Sahalarını ve aboneliğini ayarla' },
    { title: 'Özet & Ödeme', subtitle: 'Planını onayla ve kaydı tamamla' },
];

/** 0555 555 55 55 → 0555 *** ** 55 (doğrulama alt başlığında gösterilir) */
const maskPhone = (p: string): string => {
    const d = (p || '').replace(/\D/g, '');
    if (d.length < 6) return 'telefonuna';
    return `${d.slice(0, 4)} *** ** ${d.slice(-2)}`;
};

export const BusinessRegister: React.FC = () => {
    const navigate = useNavigate();
    const {
        currentStep,
        error, isLoading,
        fieldErrors,
        isGeocoding, setIsGeocoding,
        isLocationModalOpen, setIsLocationModalOpen,
        locationModalStep,
        isTimePickerOpen, setIsTimePickerOpen,
        tempSlot, setTempSlot,
        formData,
        otpSending, resendCountdown, otpCode, setOtpCode,
        ownerPasswordConfirm, setOwnerPasswordConfirm,
        updateOwner, updateBusiness, updatePitch,
        setPitchCount, toggleFacility, toggleClosedDay, addTimeSlot, removeTimeSlot,
        sendOtp, verifyOtp,
        handleSubmit, nextStep, prevStep,
    } = useBusinessRegister();

    // EULA onayı ödeme adımında; submit footer'a taşındığından state burada tutulur (hook'a dokunulmaz).
    const [eulaAccepted, setEulaAccepted] = useState(false);

    // ── Adım 8: sihirbaz kabuğu dışında tam-ekran başarı görünümü ──
    if (currentStep === 8) {
        return (
            <div
                className="fixed left-0 right-0 bg-gradient-to-b from-pitch-surface to-pitch overflow-hidden flex flex-col z-50"
                style={{ top: 'calc(-1 * env(safe-area-inset-top))', bottom: 'calc(-1 * env(safe-area-inset-bottom))' }}
            >
                <div
                    className="flex-1 min-h-0 overflow-y-auto scrollbar-hide"
                    style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
                    <div
                        className="min-h-full w-full max-w-md mx-auto flex flex-col"
                        style={{ padding: 'clamp(20px, 5vh, 40px) clamp(16px, 5vw, 32px)' }}
                    >
                        <CongratulationsStep ownerPhone={formData.owner.phone} />
                    </div>
                </div>
            </div>
        );
    }

    const onBack = currentStep === 1 ? () => navigate('/business/login') : prevStep;

    const subtitle =
        currentStep === 3
            ? `${maskPhone(formData.owner.phone)} numarasına gönderilen kodu gir`
            : STEP_META[currentStep - 1].subtitle;

    // Tek turuncu birincil footer buton token'ı (BusinessForgotPassword `primaryButton` diliyle aynı)
    const primaryButton = (label: string, onClick: () => void, disabled: boolean, isFinal = false) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="w-full bg-orange-600 text-white rounded-2xl font-display font-bold uppercase tracking-wider shadow-lg shadow-black/30 border border-orange-400/15 active:bg-orange-700 active:scale-[0.97] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            style={{ height: 'clamp(48px, 7vh, 58px)', fontSize: 'clamp(0.9rem, 2.4vh, 1.1rem)' }}
        >
            {isLoading ? (
                <>
                    <span className="w-5 h-5 flex-shrink-0">
                        <LottiePlayer
                            src="/animations/rolling-football.json"
                            loop
                            autoplay
                            ariaLabel="Yükleniyor"
                            style={{ width: '100%', height: '100%' }}
                            fallback={null}
                        />
                    </span>
                    Lütfen bekle...
                </>
            ) : (
                <>
                    {label} {isFinal ? <Check className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </>
            )}
        </button>
    );

    const footer =
        currentStep === 1 ? primaryButton('Başla', nextStep, isLoading)
        : currentStep === 2 ? primaryButton('İleri', nextStep, isLoading)
        : currentStep === 3 ? undefined /* OTP 6. hanede otomatik doğrulanır */
        : currentStep === 4 ? primaryButton('İleri', nextStep, isLoading)
        : currentStep === 5 ? primaryButton('İleri', nextStep, isLoading)
        : currentStep === 6 ? primaryButton('İleri', nextStep, isLoading)
        : currentStep === 7 ? (
            // Ödeme: submit footer'da → hata butonun hemen üstünde (üst bant kaydırmayla kaçabilir)
            <div className="space-y-2.5">
                {error && (
                    <p key={error} className="text-red-400 text-xs font-bold text-center bg-red-500/10 border border-red-500/40 rounded-xl p-2.5 animate-shake">
                        {error}
                    </p>
                )}
                {primaryButton('Kaydı Tamamla', handleSubmit, isLoading || !eulaAccepted, true)}
            </div>
        )
        : undefined;

    return (
        <>
            <AuthWizardLayout
                step={currentStep}
                totalSteps={TOTAL_STEPS}
                accent="orange"
                title={STEP_META[currentStep - 1].title}
                subtitle={subtitle}
                onBack={onBack}
                error={currentStep === 7 ? undefined : error}
                footer={footer}
            >
                {currentStep === 1 && <WelcomeStep />}

                {currentStep === 2 && (
                    <OwnerInfoStep
                        formData={formData}
                        updateOwner={updateOwner}
                        passwordConfirm={ownerPasswordConfirm}
                        setPasswordConfirm={setOwnerPasswordConfirm}
                        fieldErrors={fieldErrors}
                    />
                )}

                {currentStep === 3 && (
                    <OtpVerificationStep
                        phone={formData.owner.phone}
                        otpCode={otpCode}
                        setOtpCode={setOtpCode}
                        otpSending={otpSending}
                        isLoading={isLoading}
                        resendCountdown={resendCountdown}
                        onVerify={verifyOtp}
                        onResend={sendOtp}
                    />
                )}

                {currentStep === 4 && (
                    <BusinessDetailsStep
                        formData={formData}
                        updateBusiness={updateBusiness}
                        setIsTimePickerOpen={setIsTimePickerOpen}
                        fieldErrors={fieldErrors}
                    />
                )}

                {currentStep === 5 && (
                    <LocationStep
                        formData={formData}
                        updateBusiness={updateBusiness}
                        isGeocoding={isGeocoding}
                        setIsGeocoding={setIsGeocoding}
                        fieldErrors={fieldErrors}
                    />
                )}

                {currentStep === 6 && (
                    <PitchesAndPlanStep
                        formData={formData}
                        updatePitch={updatePitch}
                        setPitchCount={setPitchCount}
                        setIsTimePickerOpen={setIsTimePickerOpen}
                        removeTimeSlot={removeTimeSlot}
                        tempSlot={tempSlot}
                        addTimeSlot={addTimeSlot}
                        toggleFacility={toggleFacility}
                        toggleClosedDay={toggleClosedDay}
                        fieldErrors={fieldErrors}
                    />
                )}

                {currentStep === 7 && (
                    <PaymentStep
                        formData={formData}
                        eulaAccepted={eulaAccepted}
                        setEulaAccepted={setEulaAccepted}
                    />
                )}
            </AuthWizardLayout>

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
                    isTimePickerOpen.type === 'OPEN' ? 'İŞLETME AÇILIŞ' :
                        isTimePickerOpen.type === 'CLOSE' ? 'İŞLETME KAPANIŞ' :
                            isTimePickerOpen.type === 'PITCH_OPEN' ? 'SAHA AÇILIŞ' :
                                isTimePickerOpen.type === 'PITCH_CLOSE' ? 'SAHA KAPANIŞ' :
                                    isTimePickerOpen.type === 'SLOT_START' ? 'SLOT BAŞLANGIÇ' : 'SLOT BİTİŞ'
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
        </>
    );
};
