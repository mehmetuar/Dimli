import React from 'react';
import { User, Phone, Mail, Lock } from 'lucide-react';
import { Input } from '../RegisterInput';
import { RegisterSection } from '../RegisterSection';
import { sanitizePhoneInput } from '../../../../../utils/phone';

interface OwnerInfoStepProps {
    formData: any;
    updateOwner: (field: string, value: string) => void;
    passwordConfirm: string;
    setPasswordConfirm: (value: string) => void;
    fieldErrors?: Record<string, string>;
}

// Not: kök öğeye animasyon sınıfı KOYMA — AuthWizardLayout içeriği `animate-step-in` ile sarar.
export const OwnerInfoStep: React.FC<OwnerInfoStepProps> = ({ formData, updateOwner, passwordConfirm, setPasswordConfirm, fieldErrors = {} }) => {
    return (
        <RegisterSection icon={User} title="Yetkili Hesabı" desc="Panele bu bilgilerle giriş yapacaksın">
            <Input
                label="Ad Soyad"
                icon={<User className="w-5 h-5" />}
                placeholder="Ahmet Yılmaz"
                value={formData.owner.fullName}
                onChange={(e: any) => updateOwner('fullName', e.target.value)}
                required
                error={fieldErrors['owner.fullName']}
            />
            <Input
                label="Telefon"
                type="tel"
                inputMode="numeric"
                icon={<Phone className="w-5 h-5" />}
                placeholder="0555 555 55 55"
                value={formData.owner.phone}
                onChange={(e: any) => updateOwner('phone', sanitizePhoneInput(e.target.value))}
                required
                error={fieldErrors['owner.phone']}
            />
            <Input
                label="E-Posta"
                type="email"
                inputMode="email"
                autoComplete="email"
                icon={<Mail className="w-5 h-5" />}
                placeholder="ornek@saha.com"
                value={formData.owner.email}
                onChange={(e: any) => updateOwner('email', e.target.value)}
                required
                error={fieldErrors['owner.email']}
            />
            <Input
                label="Şifre"
                type="password"
                icon={<Lock className="w-5 h-5" />}
                placeholder="En az 6 karakter"
                value={formData.owner.password}
                onChange={(e: any) => updateOwner('password', e.target.value)}
                required
                error={fieldErrors['owner.password']}
            />
            <Input
                label="Şifre Tekrar"
                type="password"
                icon={<Lock className="w-5 h-5" />}
                placeholder="Şifreyi tekrar gir"
                value={passwordConfirm}
                onChange={(e: any) => setPasswordConfirm(e.target.value)}
                required
                error={fieldErrors['owner.passwordConfirm']}
            />
        </RegisterSection>
    );
};
