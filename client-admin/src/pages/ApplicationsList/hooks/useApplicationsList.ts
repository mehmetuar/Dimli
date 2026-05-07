import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../../services/adminApi';

type Status = 'pending' | 'active' | 'rejected' | 'suspended';

export const useApplicationsList = (status: Status) => {
    const navigate = useNavigate();
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        adminApi.get('/admin/applications', { params: { status } })
            .then(r => setApplications(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [status]);

    return { applications, loading, navigate };
};
