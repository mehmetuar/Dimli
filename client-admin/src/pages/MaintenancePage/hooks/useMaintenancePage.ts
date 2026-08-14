import { useCallback, useMemo, useState } from 'react';
import adminApi from '../../../services/adminApi';

export interface OrphanImage {
    publicId: string;
    url: string;
    createdAt: string;
    bytes: number;
}

interface ScanSummary {
    orphanCount: number;
    scanned: number;
    referenced: number;
    totalBytes: number;
    olderThanHours: number;
}

// Süper admin? (silme yalnız superadmin'e izinli; buton buna göre gösterilir)
function decodeAdminRole(): string {
    try {
        const token = localStorage.getItem('admin_token');
        if (!token) return 'reviewer';
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.adminRole ?? 'reviewer';
    } catch {
        return 'reviewer';
    }
}

export const useMaintenancePage = () => {
    const [orphans, setOrphans] = useState<OrphanImage[]>([]);
    const [summary, setSummary] = useState<ScanSummary | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [scanning, setScanning] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [hasScanned, setHasScanned] = useState(false);

    const isSuperadmin = useMemo(() => decodeAdminRole() === 'superadmin', []);

    // Dry-run tarama — hiçbir şey silmez.
    const scan = useCallback(async () => {
        setScanning(true);
        setError('');
        setNotice('');
        try {
            const res = await adminApi.get('/admin/maintenance/orphan-images');
            const list: OrphanImage[] = res.data?.orphans ?? [];
            setOrphans(list);
            setSummary(res.data?.summary ?? null);
            // Varsayılan: hepsi seçili
            setSelected(new Set(list.map((o) => o.publicId)));
            setHasScanned(true);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Tarama başarısız oldu.');
        } finally {
            setScanning(false);
        }
    }, []);

    const toggle = useCallback((publicId: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(publicId)) next.delete(publicId);
            else next.add(publicId);
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        setSelected((prev) =>
            prev.size === orphans.length
                ? new Set()
                : new Set(orphans.map((o) => o.publicId)),
        );
    }, [orphans]);

    // Onaylı toplu silme — seçili publicId'ler.
    const cleanup = useCallback(async () => {
        const publicIds = Array.from(selected);
        if (publicIds.length === 0) return;
        setDeleting(true);
        setError('');
        setNotice('');
        try {
            const res = await adminApi.post(
                '/admin/maintenance/orphan-images/cleanup',
                { publicIds },
            );
            setNotice(
                `${res.data?.deletedCount ?? 0} görsel silindi` +
                    (res.data?.skippedCount
                        ? `, ${res.data.skippedCount} atlandı`
                        : '') +
                    '.',
            );
            // Listeyi tazele
            await scan();
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Silme başarısız oldu.');
        } finally {
            setDeleting(false);
        }
    }, [selected, scan]);

    return {
        orphans,
        summary,
        selected,
        scanning,
        deleting,
        error,
        notice,
        hasScanned,
        isSuperadmin,
        scan,
        toggle,
        toggleAll,
        cleanup,
    };
};
