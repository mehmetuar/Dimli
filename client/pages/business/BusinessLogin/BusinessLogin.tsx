import React from 'react';

// Hooks
import { useBusinessLogin } from './hooks/useBusinessLogin';

// Components
import { BusinessLoginHeader } from './components/BusinessLoginHeader';
import { BusinessLoginForm } from './components/BusinessLoginForm';
import { BackToCustomerButton } from './components/BackToCustomerButton';

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
                style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
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
        </div>
    );
};
