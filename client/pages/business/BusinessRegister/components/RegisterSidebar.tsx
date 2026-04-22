import React from 'react';
import { Briefcase, MapPin, CheckCircle, User, Store } from 'lucide-react';

export const steps = [
    { id: 1, title: 'Yetkili', icon: User },
    { id: 2, title: 'Konum', icon: MapPin },
    { id: 3, title: 'İşletme', icon: Store },
    { id: 4, title: 'Sahalar', icon: Briefcase },
    { id: 5, title: 'Onay', icon: CheckCircle },
];

interface RegisterSidebarProps {
    currentStep: number;
}

export const RegisterSidebar: React.FC<RegisterSidebarProps> = ({ currentStep }) => {
    return (
        <div className="bg-slate-800/50 w-full md:w-1/4 p-6 border-b md:border-b-0 md:border-r border-slate-700 flex flex-row md:flex-col justify-between md:justify-start gap-4 overflow-x-auto">
            <div className="mb-0 md:mb-8 flex items-center gap-2">
                <img src="/icon.png" alt="DIMLİ" className="h-8 w-auto object-contain" />
                <h1 className="font-black text-white italic hidden md:block">DIMLİ</h1>
            </div>

            <div className="flex flex-row md:flex-col gap-2">
                {steps.map((step) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    return (
                        <div
                            key={step.id}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50' :
                                isCompleted ? 'text-green-500' : 'text-slate-500'
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isActive ? 'border-white bg-white/20' :
                                isCompleted ? 'border-green-500 bg-green-500/10' : 'border-slate-600 bg-slate-800'
                                }`}>
                                {isCompleted ? <CheckCircle size={16} /> : <Icon size={16} />}
                            </div>
                            <span className={`font-bold text-sm hidden md:block ${isActive ? 'text-white' : ''}`}>
                                {step.title}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const Input = ({ label, type = "text", value, onChange, required, textarea, icon }: any) => (
    <div className="flex flex-col gap-1 w-full">
        <label className="text-xs text-slate-400 font-bold uppercase ml-1 block">{label} {required && <span className="text-red-500">*</span>}</label>
        <div className="relative">
            {icon && <div className="absolute left-3 top-3.5 text-slate-500">{icon}</div>}
            {textarea ? (
                <textarea
                    className={`w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all font-medium min-h-[100px] resize-none ${icon ? 'pl-10' : ''}`}
                    value={value}
                    onChange={onChange}
                    required={required}
                />
            ) : (
                <input
                    type={type}
                    className={`w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all font-medium ${icon ? 'pl-10' : ''}`}
                    value={value}
                    onChange={onChange}
                    required={required}
                />
            )}
        </div>
    </div>
);
