import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';

const MIN_LENGTH = 6;

export interface PasswordStrength {
    score: 0 | 1 | 2 | 3 | 4;   // 0 boş, 1 zayıf … 4 çok güçlü
    label: string;
    barClass: string;           // dolu çubuk rengi
    textClass: string;          // etiket rengi
    pct: number;                // 0-100 dolu yüzdesi
}

const computeStrength = (pwd: string): PasswordStrength => {
    if (!pwd) {
        return { score: 0, label: '', barClass: 'bg-slate-700', textClass: 'text-slate-500', pct: 0 };
    }
    let s = 0;
    if (pwd.length >= MIN_LENGTH) s++;
    if (pwd.length >= 10) s++;
    if (/[A-ZĞÜŞİÖÇ]/.test(pwd) && /[a-zğüşıöç]/.test(pwd)) s++;
    if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) s++;
    const score = Math.min(4, s) as PasswordStrength['score'];

    const map: Record<number, Omit<PasswordStrength, 'score' | 'pct'>> = {
        1: { label: 'Zayıf', barClass: 'bg-red-500', textClass: 'text-red-400' },
        2: { label: 'Orta', barClass: 'bg-amber-500', textClass: 'text-amber-400' },
        3: { label: 'Güçlü', barClass: 'bg-lime-500', textClass: 'text-lime-400' },
        4: { label: 'Çok Güçlü', barClass: 'bg-green-500', textClass: 'text-green-400' },
    };
    const meta = map[Math.max(1, score)];
    return { score, pct: (Math.max(1, score) / 4) * 100, ...meta };
};

export const useBusinessPassword = () => {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (error) setError('');
    };

    const strength = useMemo(() => computeStrength(formData.newPassword), [formData.newPassword]);

    const lengthOk = formData.newPassword.length >= MIN_LENGTH;
    const isMatch = formData.confirmPassword.length > 0 && formData.newPassword === formData.confirmPassword;
    const isDifferent = formData.newPassword.length > 0 && formData.newPassword !== formData.currentPassword;

    const isValid =
        formData.currentPassword.length > 0 &&
        lengthOk &&
        isMatch &&
        isDifferent;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
            setError('Lütfen tüm alanları doldurun.');
            return;
        }
        if (!lengthOk) {
            setError(`Şifre en az ${MIN_LENGTH} karakter olmalıdır.`);
            return;
        }
        if (formData.newPassword !== formData.confirmPassword) {
            setError('Yeni şifreler eşleşmiyor.');
            return;
        }
        if (!isDifferent) {
            setError('Yeni şifre mevcut şifreden farklı olmalı.');
            return;
        }

        setSaving(true);
        setSuccess(false);
        setError('');
        try {
            await api.patch('/business-owner/change-password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
            });
            setSuccess(true);
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowCurrent(false);
            setShowNew(false);
            setShowConfirm(false);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Şifre güncelleme başarısız oldu. Mevcut şifrenizi kontrol edin.');
        } finally {
            setSaving(false);
        }
    };

    return {
        navigate,
        formData,
        handleChange,
        showCurrent, setShowCurrent,
        showNew, setShowNew,
        showConfirm, setShowConfirm,
        saving,
        success,
        error,
        strength,
        lengthOk,
        isMatch,
        isValid,
        minLength: MIN_LENGTH,
        handleSubmit,
    };
};
