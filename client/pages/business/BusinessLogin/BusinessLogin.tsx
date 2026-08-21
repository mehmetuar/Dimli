import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Hooks
import { useBusinessLogin } from './hooks/useBusinessLogin';

// Services
import { isCoachDone } from '../../../services/coachStorage';
import { useBootSplashDone } from '../../../services/bootSplashStore';

// Components
import { BusinessLoginHeader } from './components/BusinessLoginHeader';
import { BusinessLoginForm } from './components/BusinessLoginForm';
import { BackToCustomerButton } from './components/BackToCustomerButton';
import { BusinessRegisterCoach } from './components/BusinessRegisterCoach';

export const BusinessLogin: React.FC = () => {
    const {
        email, setEmail,
        password, setPassword,
        showPassword, setShowPassword,
        error,
        isSubmitting,
        keyboardOpen,
        animClass,
        handleLogin,
        goToCustomer,
    } = useBusinessLogin();

    // Tek seferlik "İşletme Kaydı Oluştur" yönlendirmesi (§106): flip girişi +
    // enter-up oturduktan sonra (~800ms). Oturum süresi dolup düşen işletmeci
    // (sessionExpired) zaten hesaplı — gösterilmez; splash perdesi varken de açılmaz.
    const location = useLocation();
    const splashDone = useBootSplashDone();
    const [showCoach, setShowCoach] = useState(false);
    useEffect(() => {
        if (!splashDone || isCoachDone('bizreg') || location.state?.sessionExpired) return;
        const timer = setTimeout(() => setShowCoach(true), 800);
        return () => clearTimeout(timer);
    }, [splashDone]);

    return (
        <div
            className="fixed left-0 right-0 w-full overflow-hidden flex flex-col flip-perspective"
            style={{
                top: 'calc(-1 * env(safe-area-inset-top))',
                bottom: 'calc(-1 * env(safe-area-inset-bottom))',
                // Üstte sıcak turuncu glow → altta premium lacivert (slate-900 → slate-800); siyah baskınlığı yok
                background: 'radial-gradient(130% 92% at 50% 13%, #2e1408 0%, #1a1620 32%, #14202f 60%, #0f172a 84%, #1e293b 100%)',
            }}
        >
            <div
                className={`flip-card-3d relative flex-1 w-full min-h-0 flex flex-col overflow-y-auto scrollbar-hide ${animClass}`}
                style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'var(--safe-bottom)' }}
            >
                <BusinessLoginHeader keyboardOpen={keyboardOpen} />

                <BusinessLoginForm
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    error={error}
                    isSubmitting={isSubmitting}
                    keyboardOpen={keyboardOpen}
                    onSubmit={handleLogin}
                />

                <BackToCustomerButton keyboardOpen={keyboardOpen} onClick={goToCustomer} />
            </div>

            {/* Tek seferlik işletme kaydı yönlendirmesi (§106) */}
            {showCoach && <BusinessRegisterCoach onClose={() => setShowCoach(false)} />}
        </div>
    );
};
