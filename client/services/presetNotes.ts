import api from './api';

// İşletmenin "hazır notları" (sık kullanılan, sohbete gönderilebilen kısa not
// şablonları). Sunucu işletme kimliğini owner JWT'den çözer; client businessId
// göndermez (bkz. server/src/preset-notes).
export interface PresetNote {
    id: string;
    content: string;
    createdAt: string;
}

export const listPresetNotes = (): Promise<PresetNote[]> =>
    api.get('/preset-notes').then((r) => r.data);

export const createPresetNote = (content: string): Promise<PresetNote> =>
    api.post('/preset-notes', { content }).then((r) => r.data);

export const updatePresetNote = (id: string, content: string): Promise<PresetNote> =>
    api.patch(`/preset-notes/${id}`, { content }).then((r) => r.data);

export const deletePresetNote = (id: string): Promise<{ success: boolean }> =>
    api.delete(`/preset-notes/${id}`).then((r) => r.data);
