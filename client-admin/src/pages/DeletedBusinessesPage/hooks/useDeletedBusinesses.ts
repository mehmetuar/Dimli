import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../../services/adminApi';

export const useDeletedBusinesses = () => {
    const navigate = useNavigate();
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminApi.get('/admin/businesses/deleted')
            .then(r => setBusinesses(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return { businesses, loading, navigate };
};
