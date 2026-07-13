import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Check } from 'lucide-react';

// Hooks
import { useRegister } from './hooks/useRegister';

// Components
import { AuthWizardLayout } from '../../../components/Layout/AuthWizardLayout';
import { CUSTOMER_HOME } from '../../../constants/routes';
import { CelebrationScreen } from '../../../components/UI/CelebrationScreen';
import { startTour } from '../../../services/tourStore';
import { markTourPending } from '../../../services/tourStorage';
import { LottiePlayer } from '../../../components/UI/LottiePlayer';
import { UsernameStep } from './components/steps/UsernameStep';
import { PasswordStep } from './components/steps/PasswordStep';
import { NameStep } from './components/steps/NameStep';
import { PhoneVerificationStep } from './components/steps/PhoneVerificationStep';
import { BirthDateEmailStep } from './components/steps/BirthDateEmailStep';
import { PlayerProfileStep } from './components/steps/PlayerProfileStep';
import { PhotoUploadStep } from './components/steps/PhotoUploadStep';

const TOTAL_STEPS = 7;

// Kayıt kutlaması Lottie'si — özel bir animasyon bulununca yalnız bu satır değişir
const REGISTER_SUCCESS_LOTTIE = '/animations/world-cup.json';

// Adım başlıkları layout header'ında gösterilir (adım bileşenlerinde büyük başlık YOK)
const STEP_META: { title: string; subtitle?: string }[] = [
    { title: 'Kullanıcı Adı', subtitle: 'Sana özel bir kullanıcı adı seç' },
    { title: 'Şifre', subtitle: 'Hesabın için güçlü bir şifre belirle' },
    { title: 'Ad Soyad', subtitle: 'Sahada görünecek adın' },
    { title: 'Telefon Doğrulama', subtitle: 'SMS ile 6 haneli kod göndereceğiz' },
    { title: 'Doğum Tarihi', subtitle: 'E-posta eklemek isteğe bağlı' },
    { title: 'Oyuncu Profili', subtitle: 'Mevki, ayak ve uyruk bilgin' },
    { title: 'Profil Fotoğrafı', subtitle: 'İsteğe bağlı — sonra da ekleyebilirsin' },
];

export const Register: React.FC = () => {
    const navigate = useNavigate();
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
        registerSuccess,
        handleChange,
        sendOtp,
        uploadAvatar,
        nextStep,
        prevStep,
        handleRegister
    } = useRegister();

    const [eulaAccepted, setEulaAccepted] = React.useState(false);

    // Adım 4'te İleri, telefon doğrulanana dek gizli (OTP zaten otomatik ilerletiyor)
    const showPrimary = step !== 4 || otpVerified;
    const isFinalStep = step === TOTAL_STEPS;
    const busy = loading || uploadLoading;

    return (
        <>
            <AuthWizardLayout
                step={step}
                totalSteps={TOTAL_STEPS}
                title={STEP_META[step - 1].title}
                subtitle={STEP_META[step - 1].subtitle}
                onBack={step === 1 ? () => navigate('/login') : prevStep}
                error={error}
                footer={
                    <>
                        {showPrimary && (
                            <button
                                type="button"
                                onClick={isFinalStep ? handleRegister : nextStep}
                                disabled={busy || (isFinalStep && !eulaAccepted)}
                                className="w-full bg-turf-600 text-white rounded-2xl font-display font-bold uppercase tracking-wider shadow-lg shadow-black/30 border border-turf-400/15 active:bg-turf-700 active:scale-[0.97] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                                style={{ height: 'clamp(48px, 7vh, 58px)', fontSize: 'clamp(0.9rem, 2.4vh, 1.1rem)' }}
                            >
                                {busy ? (
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
                                        {isFinalStep ? 'Kaydediliyor...' : 'Kontrol ediliyor...'}
                                    </>
                                ) : isFinalStep ? (
                                    <>Kaydı Tamamla <Check className="w-5 h-5" /></>
                                ) : (
                                    <>İleri <ChevronRight className="w-5 h-5" /></>
                                )}
                            </button>
                        )}
                        {step === 1 && (
                            <p className="text-center text-slate-400 text-sm mt-3">
                                Zaten hesabın var mı?{' '}
                                <Link to="/login" className="text-turf-500 font-bold hover:underline">
                                    Giriş Yap
                                </Link>
                            </p>
                        )}
                    </>
                }
            >
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
                            onUpload={uploadAvatar}
                        />

                        {/* Apple 1.2 — EULA onayı kayıt öncesi zorunlu; işaretlenmeden
                            footer'daki "Kaydı Tamamla" görünür-disabled kalır */}
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
                    </>
                )}
            </AuthWizardLayout>

            {/* Kayıt başarı kutlaması — otomatik geçiş YOK (kullanıcı kararı): animasyon
                BAŞLA'ya basılana kadar döner; ana sayfaya geçiş yalnız butonla (replace:
                geri tuşu sihirbaza dönmesin) */}
            <CelebrationScreen
                isOpen={registerSuccess}
                lottieSrc={REGISTER_SUCCESS_LOTTIE}
                lottieLoop
                fallback={<img src="/icon.png" alt="DİMLİ" style={{ height: 80 }} />}
                title={`HOŞ GELDİN ${(formData.full_name.trim() || formData.username).toLocaleUpperCase('tr')}!`}
                subtitle="Hesabın hazır. İyi maçlar!"
                buttonLabel="BAŞLA"
                onDone={() => {
                    // Tanıtım turu SADECE yeni kayıtta otomatik başlar (kullanıcı kararı):
                    // Sahalar turu hemen; Joker/Takım turları ilgili sayfaya ilk girişte
                    // (pending bayrağı — Takım turu normalde Sahalar turundan zincirlenir,
                    // pending yalnız tur atlanırsa devreye giren sigortadır).
                    void markTourPending('jokers');
                    void markTourPending('team');
                    void markTourPending('marketplace');
                    startTour('pitches');
                    navigate(CUSTOMER_HOME, { replace: true });
                }}
            />
        </>
    );
};
