import React from 'react';

interface InactiveStatusWarningProps {
    status: string | null;
}

export const InactiveStatusWarning: React.FC<InactiveStatusWarningProps> = ({ status }) => {
    if (status !== 'expired' && status !== 'cancelled') return null;
    return (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl px-4 py-3.5">
            <p className="text-red-400 text-sm text-center leading-relaxed">
                {status === 'expired'
                    ? 'Aboneliğinizin süresi doldu. Sahalarınız liste dışı — yeni bir plan seçin.'
                    : 'Aboneliğiniz iptal edildi. Tekrar abone olmak için plan seçin.'}
            </p>
        </div>
    );
};
