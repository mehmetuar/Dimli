import React from 'react';
import { BusinessStorefrontArt } from '../../../../components/UI/BusinessStorefrontArt';

interface BackToCustomerButtonProps {
    keyboardOpen: boolean;
    onClick: () => void;
}

export const BackToCustomerButton: React.FC<BackToCustomerButtonProps> = ({ keyboardOpen, onClick }) => {
    return (
        <div
            className="relative z-10 flex-shrink-0 flex flex-col justify-end pointer-events-none transition-all duration-200"
            style={{
                // Vitrinli işletme cephesini akışta REZERVE et (sanatla aynı clamp) + butonu en alta.
                // pointer-events-none: rezerve boş bant, üstteki "İşletme Kaydı Oluştur" linkinin
                // tıklamasını yutmasın (buton kendi pointer-events-auto'suyla tıklanabilir kalır).
                minHeight: keyboardOpen ? undefined : 'clamp(160px, 28vh, 255px)',
                padding: keyboardOpen
                    ? '0 clamp(16px, 5vw, 32px) clamp(10px, 1.5vh, 16px)'
                    : '0 clamp(16px, 5vw, 32px) clamp(20px, 3.5vh, 32px)',
            }}
        >
            {/* Vitrinli işletme çizgi-animasyonu (butonun arkasında, butonu giriş olarak sarar) */}
            <BusinessStorefrontArt keyboardOpen={keyboardOpen} />

            <button
                type="button"
                onClick={onClick}
                className="relative z-10 pointer-events-auto block w-full rounded-2xl text-center font-bold tracking-wide text-white shadow-lg active:scale-[0.98] transition-all"
                style={{
                    background: '#475569',
                    boxShadow: '0 8px 20px -6px rgba(71,85,105,0.45)',
                    WebkitTapHighlightColor: 'transparent',
                    height: keyboardOpen ? 'clamp(36px, 5.5vh, 48px)' : 'clamp(44px, 7vh, 58px)',
                    fontSize: keyboardOpen ? 'clamp(0.7rem, 1.8vh, 0.8rem)' : 'clamp(0.8rem, 2.2vh, 0.95rem)',
                }}
            >
                Oyuncu Girişine Dön
            </button>
        </div>
    );
};
