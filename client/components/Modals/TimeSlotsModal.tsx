import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Plus, Trash2, Clock } from 'lucide-react';
import { useModalBodyClass } from '../../utils/useModalBodyClass';
import { BusinessTimePickerModal } from './BusinessTimePickerModal';
import {
    toMinutes,
    isWithinBounds,
    slotsOverlap,
    sortSlotsByNightRule,
} from '../../utils/nightSlot';

interface TimeSlot {
    startTime: string;
    endTime: string;
}

interface TimeSlotsModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedSlots: TimeSlot[];
    onSlotsChange: (slots: TimeSlot[]) => void;
    pitchName?: string;
    pitchOpenTime?: string;  // e.g. "08:00" — slot bu saatten önce olamaz
    pitchCloseTime?: string; // e.g. "23:00" — slot bu saatten sonra olamaz
}

const sortSlots = sortSlotsByNightRule;

// ─── Ana modal içeriği ────────────────────────────────────────────────────────

type PickerTarget = 'start' | 'end' | null;

const TimeSlotsModalContent: React.FC<TimeSlotsModalProps> = ({
    onClose, selectedSlots, onSlotsChange,
    pitchName, pitchOpenTime, pitchCloseTime,
}) => {
    const [newStart, setNewStart] = useState(pitchOpenTime || '08:00');
    const [newEnd, setNewEnd] = useState('09:00');
    const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
    const [error, setError] = useState('');

    const handleAddSlot = () => {
        setError('');
        const newSlot: TimeSlot = { startTime: newStart, endTime: newEnd };

        if (newStart === newEnd) {
            setError('Başlangıç ve bitiş saati aynı olamaz.');
            return;
        }
        const startMin = toMinutes(newStart);
        let endMin = toMinutes(newEnd);
        if (endMin === 0) endMin = 1440; // "00:00" = gece yarısı
        if (endMin < startMin) endMin += 1440; // gece yarısını geçen slot geçerli
        if (endMin <= startMin) {
            setError('Bitiş saati başlangıçtan sonra olmalı.');
            return;
        }
        if (!isWithinBounds(newSlot, pitchOpenTime || '', pitchCloseTime || '')) {
            setError(`Slot ${pitchOpenTime}–${pitchCloseTime} saatleri arasında olmalı.`);
            return;
        }
        const overlapping = selectedSlots.find(s => slotsOverlap(s, newSlot));
        if (overlapping) {
            setError(`Bu saat, mevcut ${overlapping.startTime}–${overlapping.endTime} slotu ile çakışıyor.`);
            return;
        }
        onSlotsChange(sortSlots([...selectedSlots, newSlot]));
    };

    const handleRemove = (idx: number) => {
        onSlotsChange(selectedSlots.filter((_, i) => i !== idx));
    };

    // Ana görünüm
    return (
        <>
            <BusinessTimePickerModal
                isOpen={pickerTarget !== null}
                onClose={() => setPickerTarget(null)}
                title={pickerTarget === 'start' ? 'BAŞLANGIÇ SAATİ' : 'BİTİŞ SAATİ'}
                initialTime={pickerTarget === 'start' ? newStart : newEnd}
                onSelect={(t) => {
                    if (pickerTarget === 'start') setNewStart(t);
                    else setNewEnd(t);
                    setError('');
                }}
            />
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px',
                paddingTop: 'max(16px, env(safe-area-inset-top))',
                borderBottom: '1px solid #1e293b', flexShrink: 0,
            }}>
                <div>
                    <p style={{ fontSize: 11, color: '#f97316', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                        {pitchName || 'Saha'} · Saat Slotları
                    </p>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: '2px 0 0' }}>
                        {selectedSlots.length > 0
                            ? <><span style={{ color: '#f97316' }}>{selectedSlots.length}</span> slot tanımlı</>
                            : 'Slot ekleyin'}
                    </h3>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'pointer', color: '#94a3b8',
                        WebkitTapHighlightColor: 'transparent', flexShrink: 0,
                    }}
                >
                    <X size={18} />
                </button>
            </div>

            {/* Açıklama */}
            <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    {pitchOpenTime && pitchCloseTime
                        ? `Slotlar ${pitchOpenTime}–${pitchCloseTime} arasında olmalı. Çakışan slotlar eklenemez.`
                        : 'Maç oynanacak saat dilimlerini belirleyin. Çakışan slotlar eklenemez.'}
                </p>
            </div>

            {/* Slot listesi */}
            <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '12px 16px' }}>
                {selectedSlots.length === 0 ? (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', padding: '32px 0',
                        border: '2px dashed #334155', borderRadius: 16,
                    }}>
                        <Clock size={28} color="#475569" style={{ marginBottom: 8 }} />
                        <p style={{ color: '#64748b', fontSize: 14, fontWeight: 600, margin: 0 }}>Henüz slot eklenmedi</p>
                        <p style={{ color: '#475569', fontSize: 12, margin: '4px 0 0' }}>Aşağıdan yeni slot ekleyin</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedSlots.map((slot, idx) => (
                            <div key={idx} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                backgroundColor: '#1e293b', borderRadius: 14,
                                border: '2px solid #334155', padding: '12px 14px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{
                                        backgroundColor: 'rgba(249,115,22,0.15)', borderRadius: 8,
                                        padding: '4px 10px', color: '#f97316', fontWeight: 800,
                                        fontSize: 16, fontVariantNumeric: 'tabular-nums',
                                    }}>
                                        {slot.startTime}
                                    </span>
                                    <span style={{ color: '#475569', fontWeight: 700, fontSize: 14 }}>→</span>
                                    <span style={{
                                        backgroundColor: 'rgba(249,115,22,0.15)', borderRadius: 8,
                                        padding: '4px 10px', color: '#f97316', fontWeight: 800,
                                        fontSize: 16, fontVariantNumeric: 'tabular-nums',
                                    }}>
                                        {slot.endTime}
                                    </span>
                                </div>
                                <button
                                    onPointerDown={() => handleRemove(idx)}
                                    style={{
                                        width: 36, height: 36, borderRadius: 10,
                                        backgroundColor: 'rgba(239,68,68,0.1)',
                                        border: '1px solid rgba(239,68,68,0.25)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', color: '#f87171',
                                        WebkitTapHighlightColor: 'transparent',
                                    }}
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Yeni slot ekleme */}
            <div style={{
                flexShrink: 0, padding: '12px 16px 0',
                borderTop: '1px solid #1e293b',
            }}>
                <p style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    Yeni Slot Ekle
                </p>

                {error ? (
                    <div style={{
                        padding: '10px 12px', borderRadius: 10, marginBottom: 10,
                        backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        color: '#f87171', fontSize: 12, fontWeight: 600,
                    }}>
                        {error}
                    </div>
                ) : null}

                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    {/* Başlangıç */}
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Başlangıç</p>
                        <button
                            onClick={() => setPickerTarget('start')}
                            style={{
                                width: '100%', backgroundColor: '#1e293b',
                                border: '2px solid #334155', borderRadius: 12,
                                color: '#fff', fontWeight: 800, fontSize: 18,
                                padding: '12px 10px', cursor: 'pointer', textAlign: 'center',
                                WebkitTapHighlightColor: 'transparent',
                                fontVariantNumeric: 'tabular-nums', minHeight: 50,
                            }}
                        >
                            {newStart}
                        </button>
                    </div>

                    <span style={{ color: '#475569', fontWeight: 700, paddingBottom: 14, fontSize: 18 }}>→</span>

                    {/* Bitiş */}
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Bitiş</p>
                        <button
                            onClick={() => setPickerTarget('end')}
                            style={{
                                width: '100%', backgroundColor: '#1e293b',
                                border: '2px solid #334155', borderRadius: 12,
                                color: '#fff', fontWeight: 800, fontSize: 18,
                                padding: '12px 10px', cursor: 'pointer', textAlign: 'center',
                                WebkitTapHighlightColor: 'transparent',
                                fontVariantNumeric: 'tabular-nums', minHeight: 50,
                            }}
                        >
                            {newEnd}
                        </button>
                    </div>

                    {/* + Ekle */}
                    <button
                        onPointerDown={handleAddSlot}
                        style={{
                            width: 50, height: 50, borderRadius: 12,
                            backgroundColor: '#ea580c', border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#fff',
                            WebkitTapHighlightColor: 'transparent', flexShrink: 0,
                        }}
                    >
                        <Plus size={22} />
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div style={{
                flexShrink: 0, padding: '12px 16px',
                paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
            }}>
                <button
                    onClick={onClose}
                    style={{
                        width: '100%', backgroundColor: '#ea580c',
                        border: 'none', borderRadius: 16,
                        color: '#fff', fontWeight: 900, fontSize: 16,
                        padding: '16px', cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent', minHeight: 52,
                    }}
                >
                    {selectedSlots.length > 0 ? `${selectedSlots.length} Slot Tanımlandı — Tamam` : 'Tamam'}
                </button>
            </div>
        </>
    );
};

// ─── Portal sarmalayıcı ───────────────────────────────────────────────────────

const TimeSlotsModalPortal: React.FC<TimeSlotsModalProps> = (props) => {
    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 99999, display: 'flex', flexDirection: 'column',
            backgroundColor: '#0f172a',
        }}>
            <TimeSlotsModalContent {...props} />
        </div>,
        document.body
    );
};

export const TimeSlotsModal: React.FC<TimeSlotsModalProps> = (props) => {
    useModalBodyClass(props.isOpen);
    if (!props.isOpen) return null;
    return <TimeSlotsModalPortal {...props} />;
};
