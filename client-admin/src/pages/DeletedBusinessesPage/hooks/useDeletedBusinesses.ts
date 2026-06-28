import { useNavigate } from 'react-router-dom';
import { usePaginatedList } from '../../../hooks/usePaginatedList';

export const useDeletedBusinesses = () => {
    const navigate = useNavigate();
    const { items, total, totalPages, page, setPage, search, setSearch, loading } =
        usePaginatedList<any>('/admin/businesses/deleted');

    return {
        businesses: items,
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
