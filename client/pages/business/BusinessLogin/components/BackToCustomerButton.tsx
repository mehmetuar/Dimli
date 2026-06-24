import React from 'react';

interface BackToCustomerButtonProps {
    keyboardOpen: boolean;
    onClick: () => void;
}

export const BackToCustomerButton: React.FC<BackToCustomerButtonProps> = ({ keyboardOpen, onClick }) => {
    return (
        <div
            className="relative flex-shrink-0 transition-all duration-200"
            style={{
                padding: keyboardOpen
                    ? '0 clamp(16px, 5vw, 32px) clamp(10px, 1.5dvh, 16px)'
                    : '0 clamp(16px, 5vw, 32px) clamp(20px, 3.5dvh, 32px)',
            }}
        >
            <button
                type="button"
                onClick={onClick}
                className="block w-full rounded-2xl text-center font-bold tracking-wide text-white shadow-lg active:scale-[0.98] transition-all"
                style={{
                    background: '#475569',
                    boxShadow: '0 8px 20px -6px rgba(71,85,105,0.45)',
                    WebkitTapHighlightColor: 'transparent',
                    height: keyboardOpen ? 'clamp(36px, 5.5dvh, 48px)' : 'clamp(44px, 7dvh, 58px)',
                    fontSize: keyboardOpen ? 'clamp(0.7rem, 1.8dvh, 0.8rem)' : 'clamp(0.8rem, 2.2dvh, 0.95rem)',
                }}
            >
                Oyuncu Girişine Dön
            </button>
        </div>
    );
};
