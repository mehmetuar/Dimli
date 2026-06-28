import React from 'react';
import { useKeyboardHeight } from '../../utils/useKeyboardHeight';
import { useModalBodyClass } from '../../utils/useModalBodyClass';

interface KeyboardAwareModalProps {
    /** Modal açık mı. Kapalıyken null döner (hook'lar yine de güvenle çalışır). */
    isOpen: boolean;
    /** Arka plana (backdrop) tıklayınca çağrılır. Verilmezse backdrop tıklaması yok sayılır. */
    onClose?: () => void;
    /** Yığın sırası — örn. "z-[70]" (varsayılan), "z-[100]". */
    zClassName?: string;
    /** Backdrop görünümü — varsayılan koyu + blur + fade-in. */
    backdropClassName?: string;
    /** Backdrop'a uygulanacak ek satır içi stil (klavye `bottom` offset'i ile birleştirilir). */
    backdropStyle?: React.CSSProperties;
    /**
     * Dikey hizalama:
     * - 'center' (varsayılan): kart dikeyde ortalanır.
     * - 'sheet': küçük ekranda alttan yapışan sayfa (rounded-t), sm+ ekranda ortalanır.
     */
    align?: 'center' | 'sheet';
    /** Kart (panel) ek sınıfları — bg/border/rounded/max-w vb. */
    panelClassName?: string;
    /** Kart (panel) satır içi stili — özel arka plan/gölge için. */
    panelStyle?: React.CSSProperties;
    /** Sabit (shrink-0) başlık bölgesi — klavye açılınca kaymaz, üstte kalır. */
    header?: React.ReactNode;
    /** Kaydırılabilir gövde içeriği. */
    children: React.ReactNode;
    /** Sabit (shrink-0) alt bölge (örn. aksiyon butonları) — gövdenin altında, kaymaz. */
    footer?: React.ReactNode;
    /** Gövde sarmalayıcısının ek sınıfları (örn. padding). Varsayılan "p-6". */
    bodyClassName?: string;
    /** Kartın azami yüksekliği. Varsayılan "max-h-[90vh]". */
    maxHeightClassName?: string;
}

/**
 * Merkez-kart / bottom-sheet modalları için tek tip, klavyeye duyarlı sarmalayıcı.
 *
 * Çalışma modeli (iOS + Android ortak — uygulama genelinde tek kaynak):
 * - Klavye WebView'in üstüne biner (capacitor.config: resize 'none', Android resizeOnFullScreen false).
 * - Klavye açılınca dış katmanın `bottom`'u keyboardHeight kadar yükselir → kart klavyenin
 *   üstündeki görünür alana ortalanır.
 * - Kart `flex flex-col max-h-[90vh] overflow-hidden`; gövde `overflow-y-auto flex-1` →
 *   içerik taşarsa kart içinde kayar, asla taşmaz/sıkışmaz.
 * - Odaklanan input'u ortaya getirme işini global `useKeyboardScroll` (App.tsx) yapar; gövde
 *   kaydırılabilir olduğu için scrollIntoView etkilidir.
 *
 * Yapı: [header (shrink-0)] + [children (kaydırılabilir gövde)] + [footer (shrink-0)].
 * Referans desen: CreateMatchModal / CreateTeamModal.
 */
export const KeyboardAwareModal: React.FC<KeyboardAwareModalProps> = ({
    isOpen,
    onClose,
    zClassName = 'z-[70]',
    backdropClassName = 'bg-black/80 backdrop-blur-sm animate-fade-in',
    backdropStyle,
    align = 'center',
    panelClassName = 'bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl',
    panelStyle,
    header,
    children,
    footer,
    bodyClassName = 'p-6',
    maxHeightClassName = 'max-h-[90vh]',
}) => {
    const keyboardHeight = useKeyboardHeight();
    useModalBodyClass(isOpen);

    if (!isOpen) return null;

    const kbOpen = keyboardHeight > 0;

    // Klavye açıkken ortalanan kartı klavyenin hemen üstüne yapıştır (boşluğu azalt).
    // 'sheet' zaten küçük ekranda alta yapışık olduğu için dokunulmaz.
    const alignClass =
        align === 'sheet'
            ? 'items-end sm:items-center justify-center'
            : kbOpen
                ? 'items-end justify-center'
                : 'items-center justify-center';

    // 'sheet' modunda küçük ekranda üst köşeler yuvarlak, sm+ tam yuvarlak; panelClassName
    // kendi rounded sınıfını getirmediği sürece makul varsayılan uygulanır.
    const sheetRounding = align === 'sheet' ? 'rounded-t-3xl sm:rounded-3xl' : '';

    // Backdrop'u tam ekran tut (bottom:0 kalır), kartı paddingBottom ile klavyenin üstüne taşı.
    // Böylece backdrop klavyenin arkasına kadar örter → klavye/modal arasında arka plan sızmaz.
    const overlayStyle: React.CSSProperties = {
        ...backdropStyle,
        ...(kbOpen ? { paddingBottom: keyboardHeight } : {}),
    };

    return (
        <div
            className={`fixed inset-0 ${zClassName} flex ${alignClass} px-4 ${backdropClassName}`}
            style={Object.keys(overlayStyle).length ? overlayStyle : undefined}
            onClick={onClose ? () => onClose() : undefined}
        >
            <div
                className={`flex flex-col ${kbOpen ? '' : maxHeightClassName} overflow-hidden ${sheetRounding} ${panelClassName}`}
                style={kbOpen ? { ...panelStyle, maxHeight: `calc(100vh - ${keyboardHeight}px)` } : panelStyle}
                onClick={(e) => e.stopPropagation()}
            >
                {header != null && <div className="shrink-0">{header}</div>}
                <div className={`overflow-y-auto overscroll-contain flex-1 ${bodyClassName}${kbOpen ? ' pb-3' : ''}`}>
                    {children}
                </div>
                {footer != null && <div className="shrink-0">{footer}</div>}
            </div>
        </div>
    );
};
