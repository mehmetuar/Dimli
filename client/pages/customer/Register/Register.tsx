import React from 'react';
import { Link } from 'react-router-dom';

// Hooks
import { useRegister } from './hooks/useRegister';

// Components
import { RegisterHeader } from './components/RegisterHeader';
import { RegisterActions } from './components/RegisterActions';
import { AccountStep } from './components/steps/AccountStep';
import { PersonalInfoStep } from './components/steps/PersonalInfoStep';
import { PlayerProfileStep } from './components/steps/PlayerProfileStep';

export const Register: React.FC = () => {
    const {
        step,
        formData,
        error,
        loading,
        isSubmitReady,
        handleChange,
        nextStep,
        prevStep,
        handleRegister
    } = useRegister();

    return (
        <div className="min-h-screen bg-pitch flex flex-col items-center justify-center px-4 pt-10 pb-10">
            <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden">

                <RegisterHeader step={step} totalSteps={3} />

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm font-bold text-center animate-shake">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister}>
                    {step === 1 && <AccountStep formData={formData} handleChange={handleChange} />}
                    {step === 2 && <PersonalInfoStep formData={formData} handleChange={handleChange} />}
                    {step === 3 && <PlayerProfileStep formData={formData} handleChange={handleChange} />}

                    <RegisterActions
                        step={step}
                        loading={loading}
                        isSubmitReady={isSubmitReady}
                        nextStep={nextStep}
                        prevStep={prevStep}
                    />
                </form>

                <div className="mt-6 text-center">
                    <p className="text-slate-400 text-sm">
                        Zaten hesabın var mı?{' '}
                        <Link to="/login" className="text-turf-500 font-bold hover:underline">
                            Giriş Yap
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
