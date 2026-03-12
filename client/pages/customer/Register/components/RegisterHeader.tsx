import React from 'react';
import { Trophy } from 'lucide-react';

interface RegisterHeaderProps {
    step: number;
    totalSteps?: number;
}

export const RegisterHeader: React.FC<RegisterHeaderProps> = ({ step, totalSteps = 3 }) => {
    return (
        <>
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 w-full h-2 bg-slate-700">
                <div
                    className="h-full bg-turf-500 transition-all duration-500 ease-out"
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                />
            </div>

            <div className="text-center mb-6 mt-4">
                <div className="inline-block bg-turf-600 p-3 rounded-xl skew-x-[-12deg] mb-2">
                    <Trophy className="w-6 h-6 text-white skew-x-[12deg]" />
                </div>
                <h1 className="font-sport font-black text-2xl text-white italic">KAYIT OL</h1>
            </div>
        </>
    );
};
