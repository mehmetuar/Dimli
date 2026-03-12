import React from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { LoadingSpinner } from '../../../../components/UI/LoadingSpinner';

interface RegisterActionsProps {
    step: number;
    loading: boolean;
    isSubmitReady: boolean;
    nextStep: () => void;
    prevStep: () => void;
}

export const RegisterActions: React.FC<RegisterActionsProps> = ({
    step, loading, isSubmitReady, nextStep, prevStep
}) => {
    return (
        <div className="flex gap-4 mt-8">
            {step > 1 && (
                <button
                    type="button"
                    onClick={prevStep}
                    className="flex-1 bg-slate-700 text-white py-4 rounded-xl font-bold hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                >
                    <ChevronLeft className="w-5 h-5" /> Geri
                </button>
            )}

            {step < 3 ? (
                <button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 bg-turf-600 text-white py-4 rounded-xl font-bold hover:bg-turf-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-turf-600/20"
                >
                    İleri <ChevronRight className="w-5 h-5" />
                </button>
            ) : (
                <button
                    type="submit"
                    disabled={loading || !isSubmitReady}
                    className="flex-1 bg-turf-600 text-white py-4 rounded-xl font-bold hover:bg-turf-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-turf-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <LoadingSpinner size="sm" text="" /> : 'Kaydı Tamamla'} <Check className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};
