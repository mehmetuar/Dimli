import React from 'react';
import { IconTrash, IconPitch, IconChevronRight } from '../../components/Icons';
import SearchInput from '../../components/SearchInput';
import Pagination from '../../components/Pagination';
import { useDeletedBusinesses } from './hooks/useDeletedBusinesses';

const DeletedBusinessesPage: React.FC = () => {
    const {
        businesses, total, totalPages, page, setPage,
        search, setSearch, loading, navigate,
    } = useDeletedBusinesses();

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-red-400">
                    <IconTrash size={18} />
                </div>
                <div>
                    <h1 className="text-xl font-black text-red-300">Silinen İşletmeler</h1>
                    <p className="text-[#7b9ab8] text-xs">Hesabını silen işletme sahiplerinin kayıtları</p>
                </div>
                <span className="ml-auto text-[#7b9ab8] text-sm font-bold">
                    {!loading && `${total} kayıt`}
                </span>
            </div>

            <div className="mb-4">
                <SearchInput value={search} onChange={setSearch} placeholder="İşletme, şehir veya sahip ara..." />
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white/5 border border-slate-700/40 rounded-2xl p-5 animate-pulse h-20" />
                    ))}
                </div>
            ) : businesses.length === 0 ? (
                <div className="text-center py-24">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-red-400">
                        <IconTrash size={28} className="opacity-40" />
                    </div>
                    <p className="font-bold text-[#dde8f5]">Kayıt bulunamadı</p>
                    <p className="text-xs mt-1 text-[#7b9ab8]">Silinmiş herhangi bir işletme yok</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {businesses.map(biz => (
                        <div
                            key={biz.id}
                            onClick={() => navigate(`/applications/${biz.id}`)}
                            className="bg-[#1e2d47] border border-slate-700/40 rounded-2xl p-5 cursor-pointer hover:border-slate-500/60 hover:bg-[#243458] transition-all flex items-center justify-between gap-4 group"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2.5 mb-1.5">
                                    <h3 className="font-black text-[#dde8f5] truncate group-hover:text-orange-300 transition-colors">
                                        {biz.name}
                                    </h3>
                                    <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border bg-red-500/20 text-red-300 border-red-500/30">
                                        Silindi
                                    </span>
                                </div>
                                <p className="text-[#7b9ab8] text-sm">
                                    {biz.city} / {biz.district}
                                    <span className="text-slate-600 mx-1.5">·</span>
                                    <span className="inline-flex items-center gap-1">
                                        <IconPitch size={12} className="text-slate-500" />
                                        {biz.pitches?.length || 0} saha
                                    </span>
                                </p>
                                {(biz.ownerNameSnapshot || biz.owner) ? (
                                    <p className="text-slate-500 text-xs mt-1 truncate">
                                        {biz.ownerNameSnapshot || biz.owner?.fullName}
                                        {(biz.ownerEmailSnapshot || biz.owner?.email) && (
                                            <> · {biz.ownerEmailSnapshot || biz.owner?.email}</>
                                        )}
                                    </p>
                                ) : (
                                    <p className="text-slate-600 text-xs mt-1 italic">
                                        Sahip bilgisi arşivlenmemiş (eski silme)
                                    </p>
                                )}
                                {biz.deletionReason && (
                                    <p className="text-slate-600 text-xs mt-0.5 truncate">
                                        Neden: {biz.deletionReason}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-slate-500 text-xs">
                                    Silinme: {new Date(biz.deletedAt).toLocaleDateString('tr-TR')}
                                </span>
                                <IconChevronRight size={16} className="text-slate-500 group-hover:text-orange-400 transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && (
                <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
            )}
        </div>
    );
};

export default DeletedBusinessesPage;
