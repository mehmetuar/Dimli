import { useCallback, useEffect, useRef, useState } from 'react';
import adminApi from '../services/adminApi';

const PAGE_SIZE = 20;

export interface Paginated<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/**
 * Admin liste endpoint'leri için ortak sayfalama + arama hook'u.
 * - `extraParams` (ör. { status }) değişince sayfa 1'e döner.
 * - `reqId` ile stale-response guard: hızlı yazım/sekme geçişinde sadece
 *   en son istek state'i yazar → sıra bozulmaz.
 * - Debounce SearchInput tarafında yapılır; bu hook `search` değişimine tepki verir.
 */
export function usePaginatedList<T = any>(
    endpoint: string,
    extraParams: Record<string, unknown> = {},
) {
    const [items, setItems] = useState<T[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Obje referansı her render değişmesin diye stabil anahtar.
    const extraKey = JSON.stringify(extraParams);
    const reqId = useRef(0);

    // Arama veya status değişince sayfa 1'e dön (yoksa boş sayfada kalınabilir).
    useEffect(() => {
        setPage(1);
    }, [search, extraKey]);

    const refetch = useCallback(async () => {
        const myId = ++reqId.current;
        setLoading(true);
        try {
            const res = await adminApi.get(endpoint, {
                params: {
                    page,
                    limit: PAGE_SIZE,
                    search: search.trim() || undefined,
                    ...JSON.parse(extraKey),
                },
            });
            if (myId !== reqId.current) return; // stale → at
            setItems(res.data.items ?? []);
            setTotal(res.data.total ?? 0);
            setTotalPages(res.data.totalPages ?? 1);
        } catch (e) {
            if (myId === reqId.current) console.error(e);
        } finally {
            if (myId === reqId.current) setLoading(false);
        }
    }, [endpoint, page, search, extraKey]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    // Son sayfadaki son kayıt silinince totalPages düşerse, aralık dışı kalan
    // sayfayı son geçerli sayfaya çek (boş/aralık-dışı sayfada kalmayı önler).
    // totalPages her zaman >= 1 olduğu için page asla 1'in altına inmez.
    useEffect(() => {
        setPage((p) => (p > totalPages ? totalPages : p));
    }, [totalPages]);

    return {
        items,
        total,
        totalPages,
        page,
        setPage,
        search,
        setSearch,
        loading,
        refetch,
    };
}
