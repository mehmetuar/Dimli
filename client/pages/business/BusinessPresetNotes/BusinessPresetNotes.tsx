import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    MessageSquareText,
    Plus,
    Trash2,
    Pencil,
    Check,
    X,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';
import { ConfirmModal } from '../../../components/Modals/ConfirmModal';
import { useBusinessPresetNotes } from './hooks/useBusinessPresetNotes';

export const BusinessPresetNotes: React.FC = () => {
    const navigate = useNavigate();
    const {
        notes,
        loading,
        newContent,
        setNewContent,
        adding,
        handleAdd,
        editingId,
        editingContent,
        setEditingContent,
        startEdit,
        cancelEdit,
        handleSaveEdit,
        savingEdit,
        deleteId,
        setDeleteId,
        handleConfirmDelete,
        deleting,
        toast,
        MAX_LEN,
    } = useBusinessPresetNotes();

    if (loading) return <BusinessLoadingSpinner fullScreen />;

    return (
        <div
            className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col overflow-hidden"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            {/* Header */}
            <div
                className="flex-shrink-0 border-b border-slate-700/60 px-4 py-3.5 flex items-center gap-3"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
            >
                <button
                    onClick={() => navigate('/business/settings')}
                    className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 active:scale-95 transition-all flex-shrink-0"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-indigo-500/15 rounded-lg border border-indigo-500/20 flex-shrink-0">
                        <MessageSquareText className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-sport font-black text-[clamp(15px,4.6vw,20px)] text-white tracking-tight leading-tight truncate">
                            Hazır Notlar
                        </h1>
                        <p className="text-[clamp(9px,2.6vw,11px)] text-slate-400 font-medium tracking-wider uppercase">
                            Sık kullandığın notlar
                        </p>
                    </div>
                </div>
            </div>

            <div
                className="flex-1 overflow-y-auto overscroll-contain"
                style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
                <div className="p-4 space-y-3" style={{ minHeight: 'calc(100% + 1px)' }}>
                    {/* Açıklama */}
                    <p className="text-[clamp(10px,2.8vw,12px)] text-slate-400 leading-relaxed px-1">
                        Buraya kaydettiğin notları, bir maçı onaylarken veya takımlara not gönderirken
                        tek dokunuşla seçip gönderebilirsin.
                    </p>

                    {/* Yeni Not Ekle */}
                    <div className="bg-slate-800/70 rounded-2xl border border-slate-700/60 p-4">
                        <p className="text-[clamp(9px,2.5vw,11px)] text-slate-500 font-bold uppercase tracking-wider mb-2.5">
                            Yeni Not Ekle
                        </p>
                        <textarea
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value.slice(0, MAX_LEN))}
                            placeholder="Örn: Lütfen 15 dk erken gelin"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-indigo-500 min-h-[72px] resize-none"
                        />
                        <div className="flex items-center justify-between mt-2.5">
                            <span className="text-[10px] text-slate-600 font-medium">
                                {newContent.length}/{MAX_LEN}
                            </span>
                            <button
                                onClick={handleAdd}
                                disabled={adding || !newContent.trim()}
                                className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 active:scale-95 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:active:scale-100"
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                <Plus className="w-4 h-4" />
                                {adding ? 'Ekleniyor...' : 'Ekle'}
                            </button>
                        </div>
                    </div>

                    {/* Liste / boş durum */}
                    {notes.length > 0 ? (
                        <div className="space-y-2">
                            {notes.map((note) => (
                                <div
                                    key={note.id}
                                    className="bg-slate-800/60 rounded-2xl border border-slate-700/60 p-3.5"
                                >
                                    {editingId === note.id ? (
                                        <div className="space-y-2.5">
                                            <textarea
                                                value={editingContent}
                                                onChange={(e) => setEditingContent(e.target.value.slice(0, MAX_LEN))}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-indigo-500 min-h-[72px] resize-none"
                                            />
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handleSaveEdit}
                                                    disabled={savingEdit || !editingContent.trim()}
                                                    className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 active:scale-[0.98] text-white font-bold text-sm py-2.5 rounded-xl transition-all disabled:opacity-40"
                                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                                >
                                                    <Check className="w-4 h-4" />
                                                    {savingEdit ? 'Kaydediliyor...' : 'Kaydet'}
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all"
                                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                                >
                                                    <X className="w-4 h-4" />
                                                    Vazgeç
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-3">
                                            <p className="flex-1 text-[clamp(12px,3.5vw,14px)] text-slate-200 leading-relaxed whitespace-pre-wrap break-words min-w-0">
                                                {note.content}
                                            </p>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <button
                                                    onClick={() => startEdit(note)}
                                                    className="w-9 h-9 rounded-lg bg-slate-700/60 hover:bg-slate-600 border border-slate-600/50 text-slate-300 flex items-center justify-center active:scale-95 transition-all"
                                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteId(note.id)}
                                                    className="w-9 h-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 flex items-center justify-center active:scale-95 transition-all"
                                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-10 bg-slate-900/40 rounded-2xl border border-dashed border-slate-700/60">
                            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-3">
                                <MessageSquareText className="w-6 h-6 text-slate-500" />
                            </div>
                            <p className="text-slate-400 text-sm font-bold mb-1">Henüz hazır not yok</p>
                            <p className="text-slate-600 text-[clamp(10px,2.8vw,12px)]">
                                Yukarıdan ilk notunu ekle
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleConfirmDelete}
                title="Notu Sil"
                message={deleting ? 'Siliniyor...' : 'Bu hazır notu silmek istediğinize emin misiniz?'}
                confirmText="Sil"
                cancelText="Vazgeç"
                isDangerous={true}
            />

            {toast && (
                <div
                    className={`fixed top-16 left-4 right-4 z-50 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl border
                        ${toast.type === 'success' ? 'bg-green-900/90 border-green-500/40 text-green-300' : 'bg-red-900/90 border-red-500/40 text-red-300'}`}
                >
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
                    <p className="font-semibold text-sm">{toast.text}</p>
                </div>
            )}
        </div>
    );
};
