import React, { useRef, useEffect } from 'react';
import { Briefcase, MapPin, CheckCircle, User, Store, Star, CreditCard, Phone } from 'lucide-react';

export const steps = [
    { id: 1, title: 'Hoşgeldiniz', icon: Star },
    { id: 2, title: 'Hesap', icon: User },
    { id: 3, title: 'Doğrulama', icon: Phone },
    { id: 4, title: 'İşletme', icon: Store },
    { id: 5, title: 'Konum', icon: MapPin },
    { id: 6, title: 'Sahalar', icon: Briefcase },
    { id: 7, title: 'Ödeme', icon: CreditCard },
    { id: 8, title: 'Tamamlandı', icon: CheckCircle },
];

interface RegisterSidebarProps {
    currentStep: number;
}

export const RegisterSidebar: React.FC<RegisterSidebarProps> = ({ currentStep }) => {
    const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const activeRef = stepRefs.current[currentStep - 1];
        if (activeRef) {
            activeRef.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [currentStep]);

    return (
        <div className="bg-slate-800/50 w-full md:w-1/4 p-4 md:p-6 border-b md:border-b-0 md:border-r border-slate-700 flex flex-row md:flex-col justify-between md:justify-start gap-2 overflow-x-auto scrollbar-hide">
            <div className="mb-0 md:mb-8 flex items-center gap-2 shrink-0">
                <img src="/icon.png" alt="DİMLİ" className="h-8 w-auto object-contain" />
                <h1 className="font-black text-white italic hidden md:block">DİMLİ</h1>
            </div>

            <div className="flex flex-row md:flex-col gap-1.5 md:gap-2">
                {steps.map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    return (
                        <div
                            key={step.id}
                            ref={el => { stepRefs.current[idx] = el; }}
                            className={`flex items-center gap-3 p-2.5 md:p-3 rounded-xl transition-all duration-300 ease-in-out shrink-0 ${isActive
                                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50 scale-[1.04]'
                                : isCompleted
                                    ? 'text-green-500'
                                    : 'text-slate-500'
                                }`}
                        >
                            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive
                                ? 'border-white bg-white/20'
                                : isCompleted
                                    ? 'border-green-500 bg-green-500/10'
                                    : 'border-slate-600 bg-slate-800'
                                }`}>
                                {isCompleted ? <CheckCircle size={15} /> : <Icon size={15} />}
                            </div>
                            <span className={`font-bold text-sm hidden md:block transition-all duration-300 ${isActive ? 'text-white' : ''}`}>
                                {step.title}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/**
 * Input'a focus olduğunda, elemanı klavyenin üstüne scroll eder.
 * iOS ve Android Capacitor ortamında çalışır.
 */
const scrollInputIntoView = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const el = e.target;
    setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
};

interface InputProps {
    label: string;
    type?: string;
    value: string | number;
    onChange: (e: any) => void;
    required?: boolean;
    textarea?: boolean;
    icon?: React.ReactNode;
    error?: string;
    placeholder?: string;
    inputMode?: string;
}

export const Input: React.FC<InputProps> = ({ label, type = "text", value, onChange, required, textarea, icon, error, placeholder, inputMode }) => (
    <div className="flex flex-col gap-1 w-full min-w-0">
        <label className="text-xs text-slate-400 font-bold uppercase ml-1 block">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            {icon && <div className="absolute left-3 top-3.5 text-slate-500">{icon}</div>}
            {textarea ? (
                <textarea
                    className={`w-full bg-slate-800 border text-white text-sm p-3 rounded-xl focus:outline-none transition-all font-medium min-h-[90px] resize-none ${icon ? 'pl-10' : ''} ${
                        error ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-orange-500'
                    }`}
                    value={value}
                    onChange={onChange}
                    required={required}
                    onFocus={scrollInputIntoView}
                    placeholder={placeholder}
                />
            ) : (
                <input
                    type={type}
                    className={`w-full bg-slate-800 border text-white text-sm p-3 rounded-xl focus:outline-none transition-all font-medium ${icon ? 'pl-10' : ''} ${
                        error ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-orange-500'
                    }`}
                    value={value}
                    onChange={onChange}
                    required={required}
                    onFocus={scrollInputIntoView}
                    placeholder={placeholder}
                    inputMode={inputMode as any}
                />
            )}
        </div>
        {error && (
            <p className="text-red-400 text-xs font-bold ml-1 mt-0.5 animate-fade-in">{error}</p>
        )}
    </div>
);
