import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';

export const useRegister = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        phone: '',
        email: '',
        birthDate: '',
        position: 'Orta Saha',
        secondaryPosition: '',
        foot: 'Sağ'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSubmitReady, setIsSubmitReady] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const nextStep = () => {
        setError('');
        if (step === 1) {
            if (!formData.username || !formData.password || !formData.confirmPassword) {
                setError('Lütfen tüm alanları doldurun.');
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setError('Şifreler eşleşmiyor.');
                return;
            }
            if (formData.password.length < 6) {
                setError('Şifre en az 6 karakter olmalıdır.');
                return;
            }
        }
        if (step === 2) {
            if (!formData.full_name || !formData.phone || !formData.birthDate) {
                setError('Lütfen zorunlu alanları doldurun.');
                return;
            }
            setIsSubmitReady(false);
            setTimeout(() => setIsSubmitReady(true), 1000);
        }
        setStep(step + 1);
    };

    const prevStep = () => {
        setError('');
        setStep(step - 1);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (step !== 3) return;

        setLoading(true);
        setError('');

        try {
            await api.post('/auth/register', formData);

            const loginResponse = await api.post('/auth/login', {
                username: formData.username,
                password: formData.password
            });

            if (loginResponse.data.access_token) {
                localStorage.setItem('token', loginResponse.data.access_token);
                navigate('/');
            } else {
                navigate('/login');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Kayıt başarısız. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    return {
        step,
        formData,
        error,
        loading,
        isSubmitReady,
        handleChange,
        nextStep,
        prevStep,
        handleRegister
    };
};
