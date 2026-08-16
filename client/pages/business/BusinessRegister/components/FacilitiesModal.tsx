import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Check, Plus } from 'lucide-react';
import { getFacilities } from '../../../../services/api';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';

interface FacilitiesModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedFacilities: string[];
    onToggle: (facility: string) => void;
    onAddCustom?: (facility: string) => void;
    pitchName?: string;
}

const FacilitiesModalContent: React.FC<FacilitiesModalProps> = ({
    onClose,
    selectedFacilities,
    onToggle,
    onAddCustom,
    pitchName,
}) => {
    const [customText, setCustomText] = useState('');
    const [facilities, setFacilities] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getFacilities().then(setFacilities).catch(console.error);
    }, []);

    const handleAddCustom = () => {
        const trimmed = customText.trim();
        if (!trimmed) return;
        onAddCustom?.(trimmed);
        setCustomText('');
    };

    const selectedCount = selectedFacilities.length;

    // DB'deki imkanlar + henüz onaylanmamış özel eklemeler
    const knownSet = new Set(facilities);
    const customFacilities = selectedFacilities.filter(f => !knownSet.has(f));
    const allFacilities = [...facilities, ...customFacilities];

    return (
        <div
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#0f172a', // slate-950
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    paddingTop: 'max(16px, env(safe-area-inset-top))',
                    borderBottom: '1px solid #1e293b',
                    backgroundColor: '#0f172a',
                    flexShrink: 0,
                }}
            >
                <div>
                    <p style={{ fontSize: 11, color: '#f97316', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                        {pitchName || 'Saha'} İmkânları
                    </p>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: '2px 0 0' }}>
                        {selectedCount > 0
                            ? <><span style={{ color: '#f97316' }}>{selectedCount}</span> imkân seçildi</>
                            : 'İmkân seçin'}
                    </h3>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: '#1e293b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'pointer', color: '#94a3b8',
                        WebkitTapHighlightColor: 'transparent',
                        flexShrink: 0,
                    }}
                >
                    <X size={18} />
                </button>
            </div>

            {/* İmkân listesi */}
            <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '12px 16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {allFacilities.map((facility) => {
                        const isSelected = selectedFacilities.includes(facility);
                        const isCustom = !knownSet.has(facility);
                        return (
                            <button
                                key={facility}
                                type="button"
                                onPointerDown={() => onToggle(facility)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '12px 12px',
                                    borderRadius: 14,
                                    border: `2px solid ${isSelected ? '#f97316' : '#334155'}`,
                                    backgroundColor: isSelected ? 'rgba(249,115,22,0.15)' : '#1e293b',
                                    color: isSelected ? '#fdba74' : '#94a3b8',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    WebkitTapHighlightColor: 'transparent',
                                    minHeight: 52,
                                    transition: 'background-color 0.15s, border-color 0.15s',
                                }}
                            >
                                {/* Checkbox */}
                                <span style={{
                                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                                    border: `2px solid ${isSelected ? '#f97316' : '#475569'}`,
                                    backgroundColor: isSelected ? '#f97316' : '#0f172a',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {isSelected && <Check size={11} strokeWidth={3} color="#fff" />}
                                </span>
                                <span style={{ lineHeight: 1.3, flex: 1 }}>
                                    {facility}
                                    {isCustom && (
                                        <span style={{ display: 'block', fontSize: 9, color: '#64748b', fontWeight: 600, marginTop: 1 }}>
                                            Özel
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Manuel imkan ekleme */}
                <div style={{ marginTop: 16 }}>
                    <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>
                        Listede yoksa ekle
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={customText}
                            onChange={e => setCustomText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddCustom(); }}
                            placeholder="Örn: Basketbol Potası"
                            style={{
                                flex: 1, backgroundColor: '#1e293b', border: '2px solid #334155',
                                borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 600,
                                padding: '12px 14px', outline: 'none',
                                WebkitTapHighlightColor: 'transparent',
                            }}
                        />
                        <button
                            type="button"
                            onPointerDown={handleAddCustom}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                backgroundColor: '#ea580c', borderRadius: 12,
                                border: 'none', color: '#fff', fontWeight: 800,
                                fontSize: 13, padding: '12px 14px', cursor: 'pointer',
                                WebkitTapHighlightColor: 'transparent',
                                whiteSpace: 'nowrap', flexShrink: 0,
                                minHeight: 48,
                            }}
                        >
                            <Plus size={15} />
                            Ekle
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{
                flexShrink: 0,
                padding: '12px 16px',
                paddingBottom: 'max(20px, var(--safe-bottom))',
                borderTop: '1px solid #1e293b',
                backgroundColor: '#0f172a',
            }}>
                <button
                    onClick={onClose}
                    style={{
                        width: '100%', backgroundColor: '#ea580c',
                        border: 'none', borderRadius: 16,
                        color: '#fff', fontWeight: 900, fontSize: 16,
                        padding: '16px', cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                        minHeight: 52,
                    }}
                >
                    {selectedCount > 0 ? `${selectedCount} İmkân Seçildi — Tamam` : 'Tamam'}
                </button>
            </div>
        </div>
    );
};

export const FacilitiesModal: React.FC<FacilitiesModalProps> = (props) => {
    useModalBodyClass(props.isOpen);
    if (!props.isOpen) return null;
    return ReactDOM.createPortal(
        <FacilitiesModalContent {...props} />,
        document.body
    );
};
