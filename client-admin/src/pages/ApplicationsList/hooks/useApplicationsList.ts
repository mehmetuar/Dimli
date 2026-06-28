import { useNavigate } from 'react-router-dom';
import { usePaginatedList } from '../../../hooks/usePaginatedList';

type Status = 'pending' | 'active' | 'rejected' | 'suspended';

export const useApplicationsList = (status: Status) => {
    const navigate = useNavigate();
    const { items, total, totalPages, page, setPage, search, setSearch, loading } =
        usePaginatedList<any>('/admin/applications', { status });

    return {
        applications: items,
        total,
        totalPages,
        page,
        setPage,
        search,
        setSearch,
        loading,
        navigate,
    };
};
