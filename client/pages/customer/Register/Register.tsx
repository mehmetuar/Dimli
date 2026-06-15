import React from 'react';
import { Link } from 'react-router-dom';

// Hooks
import { useRegister } from './hooks/useRegister';
import { useKeyboardHeight } from '../../../utils/useKeyboardHeight';

// Components
import { RegisterHeader } from './components/RegisterHeader';
import { RegisterActions } from './components/RegisterActions';
import { UsernameStep } from './components/steps/UsernameStep';
import { PasswordStep } from './components/steps/PasswordStep';
import { NameStep } from './components/steps/NameStep';
import { PhoneVerificationStep } from './components/steps/PhoneVerificationStep';
import { BirthDateEmailStep } from './components/steps/BirthDateEmailStep';
import { PlayerProfileStep } from './components/steps/PlayerProfileStep';
import { PhotoUploadStep } from './components/steps/PhotoUploadStep';

const TOTAL_STEPS = 7;

export const Register: React.FC = () => {
    const keyboardHeight = useKeyboardHeight();
    const {
        step,
        formData,
        error,
        fieldErrors,
        loading,
        otpSent,
        otpVerified,
        otpLoading,
        otpCode,
        setOtpCode,
        resendCountdown,
        uploadLoading,
        handleChange,
        sendOtp,
        uploadAvatar,
        nextStep,
        prevStep,
        handleRegister
    } = useRegister();

    const [eulaAccepted, setEulaAccepted] = React.useState(false);

    const handleFormSubmit = (e: React.FormEvent) => {
        if (step === 7 && !eulaAccepted) {
            e.preventDefault();
            return;
        }
        handleRegister(e);
    };

    return (
        <div
            className="min-h-screen bg-pitch flex flex-col items-center justify-start px-4 pt-10 pb-16"
            style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 16 : undefined }}
        >
            <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden">

                <RegisterHeader step={step} totalSteps={TOTAL_STEPS} />

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm font-bold text-center animate-shake">
                        {error}
                    </div>
                )}

                <form onSubmit={handleFormSubmit}>
                    {step === 1 && <UsernameStep formData={formData} handleChange={handleChange} fieldErrors={fieldErrors} />}
                    {step === 2 && <PasswordStep formData={formData} handleChange={handleChange} fieldErrors={fieldErrors} />}
                    {step === 3 && <NameStep formData={formData} handleChange={handleChange} fieldErrors={fieldErrors} />}
                    {step === 4 && (
                        <PhoneVerificationStep
                            formData={formData}
                            handleChange={handleChange}
                            otpSent={otpSent}
                            otpVerified={otpVerified}
                            otpLoading={otpLoading}
                            otpCode={otpCode}
                            setOtpCode={setOtpCode}
                            resendCountdown={resendCountdown}
                            sendOtp={sendOtp}
                            fieldErrors={fieldErrors}
                        />
                    )}
                    {step === 5 && <BirthDateEmailStep formData={formData} handleChange={handleChange} fieldErrors={fieldErrors} />}
                    {step === 6 && <PlayerProfileStep formData={formData} handleChange={handleChange} fieldErrors={fieldErrors} />}
                    {step === 7 && (
                        <>
                            <PhotoUploadStep
                                fullName={formData.full_name}
                                avatarUrl={formData.avatarUrl}
                                uploadLoading={uploadLoading}
                                registerLoading={loading}
                                onUpload={uploadAvatar}
                            />

                            {/* Apple 1.2 — EULA onayı kayıt öncesi zorunlu */}
                            <label className="flex items-start gap-3 mt-5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={eulaAccepted}
                                    onChange={e => setEulaAccepted(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 accent-turf-500 shrink-0"
                                />
                                <span className="text-slate-400 text-xs leading-relaxed">
                                    <button
                                        type="button"
                                        onClick={() => window.open('https://dimli.com.tr/kullanim-sartlari', '_system')}
                                        className="text-turf-500 underline underline-offset-2"
                                    >
                                        Kullanım Şartları
                                    </button>'nı ve{' '}
                                    <button
                                        type="button"
                                        onClick={() => window.open('https://dimli.com.tr/kvkk', '_system')}
                                        className="text-turf-500 underline underline-offset-2"
                                    >
                                        Gizlilik Politikası
                                    </button>'nı okudum, kabul ediyorum.
                                </span>
                            </label>

                            <button
                                type="button"
                                onClick={prevStep}
                                className="w-full mt-3 text-slate-500 hover:text-slate-300 text-sm font-bold transition-colors py-2"
                            >
                                ← Geri dön
                            </button>
                        </>
                    )}

                    {step !== 7 && (
                        <RegisterActions
                            step={step}
                            totalSteps={TOTAL_STEPS}
                            loading={loading}
                            otpVerified={otpVerified}
                            nextStep={nextStep}
                            prevStep={prevStep}
                        />
                    )}
                </form>

                <div className="mt-6 text-center">
                    <p className="text-slate-400 text-sm">
                        Zaten hesabın var mı?{' '}
                        <Link to="/login" className="text-turf-500 font-bold hover:underline">
                            Giriş Yap
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
