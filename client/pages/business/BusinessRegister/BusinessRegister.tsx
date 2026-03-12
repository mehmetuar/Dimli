import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, CheckCircle, User } from 'lucide-react';
import { LocationSelectionModal } from '../../../components/Modals/LocationSelectionModal';
import { BusinessTimePickerModal } from '../../../components/Modals/BusinessTimePickerModal';

// Hooks & Steps
import { useBusinessRegister } from './hooks/useBusinessRegister';
import { RegisterSidebar, steps } from './components/RegisterSidebar';
import { OwnerInfoStep } from './components/steps/OwnerInfoStep';
import { LocationStep } from './components/steps/LocationStep';
import { BusinessDetailsStep } from './components/steps/BusinessDetailsStep';
import { PitchesStep } from './components/steps/PitchesStep';
import { SummaryStep } from './components/steps/SummaryStep';

export const BusinessRegister: React.FC = () => {
    const {
        currentStep,
        error,
        isLoading,
        isGeocoding, setIsGeocoding,
        isLocationModalOpen, setIsLocationModalOpen,
        locationModalStep, setLocationModalStep,
        isTimePickerOpen, setIsTimePickerOpen,
        tempSlot,
        formData,
        updateOwner,
        updateBusiness,
        updatePitch,
        addPitch,
        removePitch,
        toggleFacility,
        addTimeSlot,
        removeTimeSlot,
        handleSubmit,
        nextStep,
        prevStep
    } = useBusinessRegister();

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return <OwnerInfoStep formData={formData} updateOwner={updateOwner} />;
            case 2:
                return (
                    <LocationStep
                        formData={formData}
                        updateBusiness={updateBusiness}
                        isGeocoding={isGeocoding}
                        setIsGeocoding={setIsGeocoding}
                    />
                );
            case 3:
                return (
                    <BusinessDetailsStep
                        formData={formData}
                        updateBusiness={updateBusiness}
                        setLocationModalStep={setLocationModalStep}
                        setIsLocationModalOpen={setIsLocationModalOpen}
                        setIsTimePickerOpen={setIsTimePickerOpen}
                    />
                );
            case 4:
                return (
                    <PitchesStep
                        formData={formData}
                        updatePitch={updatePitch}
                        addPitch={addPitch}
                        removePitch={removePitch}
                        setIsTimePickerOpen={setIsTimePickerOpen}
                        removeTimeSlot={removeTimeSlot}
                        tempSlot={tempSlot}
                        addTimeSlot={addTimeSlot}
                        toggleFacility={toggleFacility}
                    />
                );
            case 5:
                return <SummaryStep formData={formData} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">

                <RegisterSidebar currentStep={currentStep} />

                <div className="flex-1 flex flex-col p-6 md:p-10 relative">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-wider">
                            {steps.find(s => s.id === currentStep)?.title}
                        </h2>
                        <span className="text-slate-500 text-sm font-bold">Adım {currentStep} / 5</span>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm font-bold flex items-center gap-2">
                            <User className="w-4 h-4" /> {error}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide pb-24">
                        {renderStepContent()}
                    </div>

                    <div className="absolute bottom-6 left-6 right-6 flex justify-between pt-4 border-t border-slate-800 bg-slate-900 z-10">
                        <button
                            onClick={prevStep}
                            disabled={currentStep === 1}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors ${currentStep === 1 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            <ChevronLeft size={20} /> Geri
                        </button>

                        {currentStep < 5 ? (
                            <button
                                onClick={nextStep}
                                className="bg-white text-slate-900 px-8 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-slate-200 transition-colors shadow-lg shadow-white/10"
                            >
                                İleri <ChevronRight size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 hover:from-orange-500 hover:to-red-500 transition-all shadow-lg shadow-orange-900/30 disabled:opacity-50"
                            >
                                {isLoading ? 'Kaydediliyor...' : 'Kaydı Tamamla'} <CheckCircle size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <LocationSelectionModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                onSelect={(city, dist) => {
                    updateBusiness('city', city);
                    updateBusiness('district', dist);
                }}
                initialCity={formData.business.city}
                initialDistrict={formData.business.district}
                initialStep={locationModalStep}
            />

            <BusinessTimePickerModal
                isOpen={isTimePickerOpen.open}
                onClose={() => setIsTimePickerOpen({ ...isTimePickerOpen, open: false })}
                title={
                    isTimePickerOpen.type === 'OPEN' ? "İŞLETME AÇILIŞ" :
                        isTimePickerOpen.type === 'CLOSE' ? "İŞLETME KAPANIŞ" :
                            isTimePickerOpen.type === 'PITCH_OPEN' ? "SAHA AÇILIŞ" :
                                isTimePickerOpen.type === 'PITCH_CLOSE' ? "SAHA KAPANIŞ" :
                                    isTimePickerOpen.type === 'SLOT_START' ? "SLOT BAŞLANGIÇ" : "SLOT BİTİŞ"
                }
                initialTime={
                    isTimePickerOpen.type === 'OPEN' ? formData.business.openTime :
                        isTimePickerOpen.type === 'CLOSE' ? formData.business.closeTime :
                            isTimePickerOpen.pitchIdx !== undefined ? (
                                isTimePickerOpen.type === 'PITCH_OPEN' ? formData.pitches[isTimePickerOpen.pitchIdx].openTime :
                                    isTimePickerOpen.type === 'PITCH_CLOSE' ? formData.pitches[isTimePickerOpen.pitchIdx].closeTime :
                                        isTimePickerOpen.type === 'SLOT_START' ? tempSlot.startTime : tempSlot.endTime
                            ) : '19:00'
                }
                onSelect={(time) => {
                    if (isTimePickerOpen.type === 'OPEN') updateBusiness('openTime', time);
                    else if (isTimePickerOpen.type === 'CLOSE') updateBusiness('closeTime', time);
                    else if (isTimePickerOpen.pitchIdx !== undefined) {
                        if (isTimePickerOpen.type === 'PITCH_OPEN') updatePitch(isTimePickerOpen.pitchIdx, 'openTime', time);
                        else if (isTimePickerOpen.type === 'PITCH_CLOSE') updatePitch(isTimePickerOpen.pitchIdx, 'closeTime', time);
                        else if (isTimePickerOpen.type === 'SLOT_START') tempSlot.startTime = time;
                        else if (isTimePickerOpen.type === 'SLOT_END') tempSlot.endTime = time;
                    }
                }}
            />

            <div className="mt-6 text-center">
                <p className="text-slate-500 text-sm">
                    Zaten hesabın var mı?{' '}
                    <Link to="/business/login" className="text-orange-500 font-bold hover:underline">
                        Giriş Yap
                    </Link>
                </p>
            </div>
        </div>
    );
};
