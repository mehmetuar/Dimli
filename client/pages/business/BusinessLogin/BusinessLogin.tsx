import React from 'react';

// Hooks
import { useBusinessLogin } from './hooks/useBusinessLogin';

// Components
import { BusinessLoginHeader } from './components/BusinessLoginHeader';
import { BusinessLoginForm } from './components/BusinessLoginForm';
import { BackToCustomerButton } from './components/BackToCustomerButton';
import { BusinessForgotPasswordModal } from './components/BusinessForgotPasswordModal';

export const BusinessLogin: React.FC = () => {
    const {
        email, setEmail,
        password, setPassword,
        showPassword, setShowPassword,
        error,
        isSubmitting,
        isForgotModalOpen, setIsForgotModalOpen,
        keyboardOpen,
        animClass,
        handleLogin,
        goToCustomer,
    } = useBusinessLogin();

    return (
        <div
            className="fixed left-0 right-0 w-full bg-gradient-to-b from-slate-800 to-slate-900 overflow-hidden flex flex-col flip-perspective"
            style={{
                top: 'calc(-1 * env(safe-area-inset-top))',
                bottom: 'calc(-1 * env(safe-area-inset-bottom))',
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
                    onForgotPassword={() => setIsForgotModalOpen(true)}
                />

                <BackToCustomerButton keyboardOpen={keyboardOpen} onClick={goToCustomer} />
            </div>

            <BusinessForgotPasswordModal
                isOpen={isForgotModalOpen}
                onClose={() => setIsForgotModalOpen(false)}
            />
        </div>
    );
};
