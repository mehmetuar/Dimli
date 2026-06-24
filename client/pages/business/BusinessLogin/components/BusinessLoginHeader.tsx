import React from 'react';

interface BusinessLoginHeaderProps {
    keyboardOpen: boolean;
}

export const BusinessLoginHeader: React.FC<BusinessLoginHeaderProps> = ({ keyboardOpen }) => {
    return (
        <div
            className="relative flex flex-col items-center justify-start flex-shrink-0 transition-all duration-200"
            style={{
                paddingTop: keyboardOpen ? 'max(env(safe-area-inset-top), 50px)' : 'clamp(28px, 7dvh, 56px)',
                paddingBottom: '0px',
                maxHeight: keyboardOpen ? '17dvh' : '40dvh',
                overflow: 'hidden',
            }}
        >
            {/* Logo üzerine sol-üst / sağ-üst hafif turuncu spot ışığı */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at top left, rgba(249,115,22,0.14), transparent 55%)',
                    filter: 'blur(20px)',
                }}
            />
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at top right, rgba(249,115,22,0.14), transparent 55%)',
                    filter: 'blur(20px)',
                }}
            />
            <img
                src="/icon.png"
                alt="DİMLİ"
                className="relative z-10 object-contain animate-enter-up transition-all duration-200"
                style={{
                    width: keyboardOpen ? 'clamp(40px, 11vw, 56px)' : 'clamp(60px, 16vw, 90px)',
                    height: 'auto',
                }}
            />
            <h1
                className="relative z-10 font-sport font-black text-white italic animate-enter-up transition-all duration-200"
                style={{
                    fontSize: keyboardOpen ? 'clamp(1rem, 4.5vw, 1.4rem)' : 'clamp(1.5rem, 8vw, 2.25rem)',
                    marginTop: 'clamp(4px, 1dvh, 12px)',
                }}
            >
                İŞLETME PANELİ
            </h1>
            {!keyboardOpen && (
                <p
                    className="relative z-10 text-slate-400 animate-enter-up transition-all duration-200"
                    style={{ fontSize: 'clamp(0.7rem, 2.5vw, 0.875rem)', marginTop: '4px' }}
                >
                    DİMLİ Business
                </p>
            )}
        </div>
    );
};
