import React from 'react';
import { CorporateGridBackground } from '../../../../components/UI/CorporateGridBackground';

interface BusinessLoginHeaderProps {
    keyboardOpen: boolean;
}

export const BusinessLoginHeader: React.FC<BusinessLoginHeaderProps> = ({ keyboardOpen }) => {
    return (
        <div
            className="relative flex flex-col items-center justify-start flex-shrink-0 transition-all duration-200"
            style={{
                paddingTop: keyboardOpen ? 'max(env(safe-area-inset-top), 50px)' : 'clamp(28px, 7vh, 56px)',
                paddingBottom: '0px',
                maxHeight: keyboardOpen ? '17vh' : '40vh',
                overflow: 'hidden',
            }}
        >
            {/* Hexagon Grid Background */}
            <div className="absolute inset-0 z-0 flex justify-center pointer-events-none transition-all duration-200" style={{ width: '100%', height: '100%' }}>
                <CorporateGridBackground keyboardOpen={keyboardOpen} />
            </div>

            {/* Merkezi Turuncu Glow */}
            <div
                className="absolute inset-0 pointer-events-none transition-all duration-200"
                style={{
                    background: 'radial-gradient(circle at 50% 30%, rgba(249,115,22,0.18), transparent 60%)',
                    filter: 'blur(30px)',
                    opacity: keyboardOpen ? 0.6 : 1,
                }}
            />
            <img
                src="/icon.png"
                alt="DİMLİ"
                className="relative z-10 object-contain animate-enter-up transition-all duration-200"
                style={{
                    width: keyboardOpen ? 'clamp(40px, 11vw, 56px)' : 'clamp(60px, 16vw, 90px)',
                    height: 'auto',
                    filter: 'drop-shadow(0 0 25px rgba(249,115,22,0.4))',
                }}
            />
            <h1
                className="relative z-10 font-sport font-black italic animate-enter-up transition-all duration-200"
                style={{
                    fontSize: keyboardOpen ? 'clamp(1rem, 4.5vw, 1.4rem)' : 'clamp(1.5rem, 8vw, 2.25rem)',
                    marginTop: 'clamp(4px, 1vh, 12px)',
                    // Sentetik italik son glifi kutunun dışına taşırır; backgroundClip:text
                    // yalnızca kutu içini boyadığı için padding olmadan son "İ" kesik görünür.
                    paddingLeft: '0.15em',
                    paddingRight: '0.15em',
                    // Sıcak metalik parıltı: beyazdan amber'e dikey degrade (premium dokunuş)
                    background: 'linear-gradient(180deg, #ffffff 60%, #fed7aa 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}
            >
                İŞLETME PANELİ
            </h1>
        </div>
    );
};
