import { useState, useEffect, useCallback } from 'react';
import {
    listPresetNotes,
    createPresetNote,
    updatePresetNote,
    deletePresetNote,
    PresetNote,
} from '../../../../services/presetNotes';
import { NOTE_CHAR_LIMITS } from '../../../../utils/noteLimits';

// İşletme notu tek kaynağı ile aynı (backend + rezervasyon not ekranı = 100).
const MAX_LEN = NOTE_CHAR_LIMITS.business;

export const useBusinessPresetNotes = () => {
    const [notes, setNotes] = useState<PresetNote[]>([]);
    const [loading, setLoading] = useState(true);

    const [newContent, setNewContent] = useState('');
    const [adding, setAdding] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 2500);
    }, []);

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        try {
            setNotes(await listPresetNotes());
        } catch (error) {
            console.error('Preset notes fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const handleAdd = async () => {
        const content = newContent.trim();
        if (!content || adding) return;
        // Aynı metni tekrar eklemeyi engelle (trim'li dedupe).
        if (notes.some((n) => n.content.trim() === content)) {
            showToast('Bu not zaten kayıtlı.', 'error');
            return;
        }
        setAdding(true);
        try {
            await createPresetNote(content);
            setNewContent('');
            await fetchNotes();
            showToast('Not eklendi.');
        } catch (error: any) {
            showToast(error?.response?.data?.message || 'Not eklenemedi.', 'error');
        } finally {
            setAdding(false);
        }
    };

    const startEdit = (note: PresetNote) => {
        setEditingId(note.id);
        setEditingContent(note.content);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingContent('');
    };

    const handleSaveEdit = async () => {
        const content = editingContent.trim();
        if (!editingId || !content || savingEdit) return;
        setSavingEdit(true);
        try {
            await updatePresetNote(editingId, content);
            cancelEdit();
            await fetchNotes();
            showToast('Not güncellendi.');
        } catch (error: any) {
            showToast(error?.response?.data?.message || 'Not güncellenemedi.', 'error');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteId || deleting) return;
        setDeleting(true);
        try {
            await deletePresetNote(deleteId);
            setDeleteId(null);
            await fetchNotes();
            showToast('Not silindi.');
        } catch (error: any) {
            showToast(error?.response?.data?.message || 'Not silinemedi.', 'error');
        } finally {
            setDeleting(false);
        }
    };

    return {
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
    };
};
