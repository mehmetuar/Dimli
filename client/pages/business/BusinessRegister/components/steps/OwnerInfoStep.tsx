import React from 'react';
import { Input } from '../RegisterSidebar';
import { sanitizePhoneInput } from '../../../../../utils/phone';

interface OwnerInfoStepProps {
    formData: any;
    updateOwner: (field: string, value: string) => void;
    passwordConfirm: string;
    setPasswordConfirm: (value: string) => void;
    fieldErrors?: Record<string, string>;
}

export const OwnerInfoStep: React.FC<OwnerInfoStepProps> = ({ formData, updateOwner, passwordConfirm, setPasswordConfirm, fieldErrors = {} }) => {
    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-4">Yetkili Bilgileri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Ad Soyad" value={formData.owner.fullName} onChange={(e: any) => updateOwner('fullName', e.target.value)} required error={fieldErrors['owner.fullName']} />
                <Input label="Telefon" type="tel" inputMode="numeric" placeholder="0555 555 55 55" value={formData.owner.phone} onChange={(e: any) => updateOwner('phone', sanitizePhoneInput(e.target.value))} required error={fieldErrors['owner.phone']} />
                <Input label="E-Posta" type="email" value={formData.owner.email} onChange={(e: any) => updateOwner('email', e.target.value)} required error={fieldErrors['owner.email']} />
                <Input label="Şifre" type="password" value={formData.owner.password} onChange={(e: any) => updateOwner('password', e.target.value)} required error={fieldErrors['owner.password']} />
                <Input label="Şifre Tekrar" type="password" value={passwordConfirm} onChange={(e: any) => setPasswordConfirm(e.target.value)} required error={fieldErrors['owner.passwordConfirm']} />
            </div>
        </div>
    );
};
