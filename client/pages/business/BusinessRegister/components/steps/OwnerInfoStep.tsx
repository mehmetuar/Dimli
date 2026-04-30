import React from 'react';
import { Input } from '../RegisterSidebar';

interface OwnerInfoStepProps {
    formData: any;
    updateOwner: (field: string, value: string) => void;
    fieldErrors?: Record<string, string>;
}

export const OwnerInfoStep: React.FC<OwnerInfoStepProps> = ({ formData, updateOwner, fieldErrors = {} }) => {
    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-4">Yetkili Bilgileri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Ad Soyad" value={formData.owner.fullName} onChange={(e: any) => updateOwner('fullName', e.target.value)} required error={fieldErrors['owner.fullName']} />
                <Input label="Telefon" value={formData.owner.phone} onChange={(e: any) => updateOwner('phone', e.target.value)} required error={fieldErrors['owner.phone']} />
                <Input label="E-Posta" type="email" value={formData.owner.email} onChange={(e: any) => updateOwner('email', e.target.value)} required error={fieldErrors['owner.email']} />
                <Input label="Şifre" type="password" value={formData.owner.password} onChange={(e: any) => updateOwner('password', e.target.value)} required error={fieldErrors['owner.password']} />
            </div>
        </div>
    );
};
