import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    SupportTicket,
    createBusinessTicket,
    getMyBusinessTickets,
} from '../../../../services/supportService';

const MIN_MESSAGE_LENGTH = 10;

export const useBusinessSupport = () => {
    const navigate = useNavigate();

    const [category, setCategory] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(true);

    const loadTickets = useCallback(async () => {
        try {
            setTickets(await getMyBusinessTickets());
        } catch {
            // sessiz — liste boş kalır
        } finally {
            setLoadingTickets(false);
        }
    }, []);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    const canSubmit = !!category && message.trim().length >= MIN_MESSAGE_LENGTH && !submitting;

    const submit = async () => {
        if (!category) {
            setError('Lütfen bir konu seçin.');
            return;
        }
        if (message.trim().length < MIN_MESSAGE_LENGTH) {
            setError('Açıklama en az 10 karakter olmalı.');
            return;
        }
        setError(null);
        setSubmitting(true);
        try {
            await createBusinessTicket({ category, message: message.trim() });
            setSubmitted(true);
            loadTickets();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string | string[] } } })
                ?.response?.data?.message;
            setError(
                (Array.isArray(msg) ? msg[0] : msg) ||
                'Talep gönderilemedi. Lütfen tekrar deneyin.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setCategory(null);
        setMessage('');
        setSubmitted(false);
        setError(null);
    };

    return {
        navigate,
        category, setCategory,
        message, setMessage,
        submitting, submitted, error,
        canSubmit, submit, resetForm,
        tickets, loadingTickets,
    };
};
