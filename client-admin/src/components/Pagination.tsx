import React from 'react';
import { IconChevronLeft, IconChevronRight } from './Icons';

interface PaginationProps {
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (p: number) => void;
    loading?: boolean;
}

/** Sayfa-bazlı navigasyon (Önceki / sayfa-N / Sonraki) + toplam kayıt. Koyu tema. */
const Pagination: React.FC<PaginationProps> = ({ page, totalPages, total, onPageChange, loading }) => {
    if (total === 0) return null;
    const canPrev = page > 1 && !loading;
    const canNext = page < totalPages && !loading;

    return (
        <div className="flex items-center justify-between mt-5 px-1">
            <span className="text-[#7b9ab8] text-xs font-bold">{total} kayıt</span>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => canPrev && onPageChange(page - 1)}
                    disabled={!canPrev}
                    aria-label="Önceki sayfa"
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1e2d47] border border-slate-700/40 text-[#dde8f5] disabled:opacity-30 disabled:cursor-not-allowed hover:border-slate-500/60 transition-all"
                >
                    <IconChevronLeft size={16} />
                </button>
                <span className="text-[#dde8f5] text-sm font-bold tabular-nums min-w-[58px] text-center">
                    {page} / {totalPages}
                </span>
                <button
                    onClick={() => canNext && onPageChange(page + 1)}
                    disabled={!canNext}
                    aria-label="Sonraki sayfa"
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1e2d47] border border-slate-700/40 text-[#dde8f5] disabled:opacity-30 disabled:cursor-not-allowed hover:border-slate-500/60 transition-all"
                >
                    <IconChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
