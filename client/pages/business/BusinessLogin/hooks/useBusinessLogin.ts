import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../../../services/api';
import { initializePushNotifications } from '../../../../services/pushNotificationService';
import { useAuth } from '../../../../contexts/AuthContext';
import { useKeyboardHeight } from '../../../../utils/useKeyboardHeight';

type Phase = 'entering' | 'idle' | 'exiting-right';

export const useBusinessLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { loginAsBusiness } = useAuth();
    const keyboardHeight = useKeyboardHeight();
    const keyboardOpen = keyboardHeight > 0;

    const [phase, setPhase] = useState<Phase>(() =>
        location.state?.from === 'customer' ? 'entering' : 'idle'
    );

    useEffect(() => {
        if (phase !== 'entering') return;
        const frame = requestAnimationFrame(() =>
            requestAnimationFrame(() => setPhase('idle'))
        );
        return () => cancelAnimationFrame(frame);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return; // çift-gönderim koruması
        setError('');
        setIsSubmitting(true);
        try {
            const response = await api.post('/auth/business/login', { email, password });
            await loginAsBusiness(response.data.access_token, response.data.ownerId);
            initializePushNotifications();
            navigate('/business/dashboard');
            // başarıda navigate ile unmount → isSubmitting sıfırlanmaz (buton loader'da kalır)
        } catch (err) {
            setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
            setIsSubmitting(false);
        }
    };

    const goToCustomer = () => {
        if (phase !== 'idle') return;
        setPhase('exiting-right');
        setTimeout(() => navigate('/login', { state: { from: 'business' } }), 400);
    };

    const animClass =
        phase === 'entering' ? 'animate-flip-enter-from-customer' :
            phase === 'exiting-right' ? 'animate-flip-exit-to-customer' : '';

    return {
        email, setEmail,
        password, setPassword,
        showPassword, setShowPassword,
        error,
        isSubmitting,
        isForgotModalOpen, setIsForgotModalOpen,
        keyboardOpen,
        animClass,
        handleLogin,
        goToCustomer,
    };
};
