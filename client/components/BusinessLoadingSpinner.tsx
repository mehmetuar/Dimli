import React from 'react';

interface BusinessLoadingSpinnerProps {
    fullScreen?: boolean;
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}

export const BusinessLoadingSpinner: React.FC<BusinessLoadingSpinnerProps> = ({
    fullScreen = false,
    size = 'md',
    text = 'Yükleniyor...'
}) => {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-12 h-12',
        lg: 'w-16 h-16'
    };

    const content = (
        <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative">
                {/* Outer Ring */}
                <div className={`${sizeClasses[size]} rounded-full border-4 border-slate-700 border-t-orange-500 animate-spin`}></div>

                {/* Inner Pulse (Only for md/lg) */}
                {size !== 'sm' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>
                    </div>
                )}
            </div>

            {/* Text */}
            {text && size !== 'sm' && (
                <div className="flex flex-col items-center animate-pulse">
                    <span className="text-orange-500 font-bold text-sm tracking-widest uppercase">{text}</span>
                </div>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center">
                {content}
            </div>
        );
    }

    return content;
};
