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
                className="flex-shrink-0 border-b border-indigo-500/10 px-4 py-4 flex items-center gap-3 relative overflow-hidden"
                style={{ background: 'radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 100%)', boxShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
            >
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
                
                <button
                    onClick={() => navigate('/business/settings')}
                    className="relative z-10 w-10 h-10 bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0 shadow-lg"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative z-10 flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.15)] relative">
                        <div className="absolute inset-0 rounded-xl bg-indigo-400/10 blur-md" />
                        <MessageSquareText className="relative z-10 w-5 h-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-black text-white text-[clamp(18px,5vw,22px)] leading-tight truncate drop-shadow-sm">
                            Hazır Notlar
                        </h1>
                        <p className="text-[clamp(11px,3vw,13px)] text-slate-400 font-medium tracking-wider uppercase truncate">
                            Sık kullandığın notlar
                        </p>
                    </div>
                </div>
            </div>

            <div
                className="flex-1 overflow-y-auto overscroll-contain pb-24"
                style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
                <div className="p-4 space-y-6" style={{ minHeight: 'calc(100% + 1px)' }}>
                    
                    {/* Açıklama */}
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex items-start gap-3">
                        <div className="p-1.5 bg-slate-700/50 rounded-lg shrink-0 mt-0.5">
                            <MessageSquareText className="w-4 h-4 text-slate-400" />
                        </div>
                        <p className="text-[12px] text-slate-300 leading-relaxed font-medium">
                            Buraya kaydettiğin notları, bir maçı onaylarken veya takımlara not gönderirken tek dokunuşla seçip gönderebilirsin.
                        </p>
                    </div>

                    {/* Not Ekle */}
                    <div className="space-y-3">
                        <label className="block text-[clamp(11px,3vw,13px)] font-black uppercase tracking-widest text-slate-400 pl-2">
                            Yeni Not Ekle
                        </label>
                        <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl border border-indigo-500/20 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.15)] p-4 focus-within:border-indigo-500/50 transition-colors">
                            <textarea
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value.slice(0, MAX_LEN))}
                                placeholder="Örn: Lütfen 15 dk erken gelin..."
                                className="w-full bg-transparent border-none text-white font-medium text-[clamp(13px,3.5vw,15px)] focus:outline-none focus:ring-0 placeholder:text-slate-500 p-0 resize-none min-h-[60px]"
                            />
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                                <span className="text-[10px] font-bold tracking-wider text-slate-500">
                                    <span className={newContent.length === MAX_LEN ? 'text-orange-400' : 'text-indigo-400'}>{newContent.length}</span> / {MAX_LEN}
                                </span>
                                <button
                                    onClick={handleAdd}
                                    disabled={adding || !newContent.trim()}
                                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all disabled:opacity-50 disabled:active:scale-100 shadow-md shadow-indigo-600/20"
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    {adding ? 'Ekleniyor' : 'Ekle'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Kayıtlı Notlar */}
                    <div className="space-y-3">
                        <label className="block text-[clamp(11px,3vw,13px)] font-black uppercase tracking-widest text-slate-400 pl-2 flex items-center justify-between">
                            <span>Kayıtlı Notlar</span>
                            {notes.length > 0 && <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{notes.length} Adet</span>}
                        </label>
                        
                        {notes.length > 0 ? (
                            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-lg divide-y divide-white/5">
                                {notes.map((note) => (
                                    <div key={note.id} className="p-4 transition-colors hover:bg-slate-800/30">
                                        {editingId === note.id ? (
                                            <div className="space-y-3">
                                                <div className="bg-slate-950/40 border border-indigo-500/30 rounded-xl p-3">
                                                    <textarea
                                                        value={editingContent}
                                                        onChange={(e) => setEditingContent(e.target.value.slice(0, MAX_LEN))}
                                                        className="w-full bg-transparent border-none text-white font-medium text-[clamp(13px,3.5vw,15px)] focus:outline-none focus:ring-0 placeholder:text-slate-500 p-0 min-h-[60px] resize-none"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={handleSaveEdit}
                                                        disabled={savingEdit || !editingContent.trim()}
                                                        className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold text-xs py-3 rounded-xl transition-all disabled:opacity-50"
                                                        style={{ WebkitTapHighlightColor: 'transparent' }}
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        {savingEdit ? 'Kaydediliyor' : 'Kaydet'}
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold text-xs px-4 py-3 rounded-xl transition-all"
                                                        style={{ WebkitTapHighlightColor: 'transparent' }}
                                                    >
                                                        <X className="w-4 h-4" />
                                                        İptal
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-4">
                                                <p className="flex-1 text-[clamp(13px,3.5vw,15px)] text-slate-200 leading-relaxed whitespace-pre-wrap break-words min-w-0">
                                                    {note.content}
                                                </p>
                                                <div className="flex items-center gap-1.5 flex-shrink-0 bg-slate-950/30 p-1 rounded-xl border border-white/5">
                                                    <button
                                                        onClick={() => startEdit(note)}
                                                        className="w-8 h-8 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 flex items-center justify-center active:scale-95 transition-all"
                                                        style={{ WebkitTapHighlightColor: 'transparent' }}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <div className="w-px h-4 bg-slate-700/50" />
                                                    <button
                                                        onClick={() => setDeleteId(note.id)}
                                                        className="w-8 h-8 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 flex items-center justify-center active:scale-95 transition-all"
                                                        style={{ WebkitTapHighlightColor: 'transparent' }}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 px-4 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-dashed border-slate-700/60 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-4 shadow-inner">
                                    <MessageSquareText className="w-6 h-6 text-slate-500" />
                                </div>
                                <p className="text-white text-sm font-black mb-1.5 tracking-wide">Henüz Not Yok</p>
                                <p className="text-slate-500 text-xs max-w-[200px] leading-relaxed">
                                    Yukarıdaki alandan sık kullandığınız bir mesajı ekleyebilirsiniz.
                                </p>
                            </div>
                        )}
                    </div>
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
                    <p className="font-bold text-[13px] tracking-wide">{toast.text}</p>
                </div>
            )}
        </div>
    );
};
