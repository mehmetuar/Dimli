import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Check, X } from 'lucide-react';
import { useModalBodyClass } from '../../utils/useModalBodyClass';

interface ImageCropModalProps {
    file: File;
    onCrop: (croppedFile: File) => void;
    onCancel: () => void;
    /** Kırpma çerçevesi en-boy oranı (genişlik / yükseklik). Varsayılan: 16/9 */
    aspectRatio?: number;
}

const CROP_W = 320;

function computeInitialScale(natW: number, natH: number, cropH: number): number {
    return Math.max(CROP_W / natW, cropH / natH);
}

const ImageCropModalContent: React.FC<ImageCropModalProps> = ({ file, onCrop, onCancel, aspectRatio = 16 / 9 }) => {
    const CROP_H = Math.round(CROP_W / aspectRatio);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
    const [objectUrl, setObjectUrl] = useState('');
    const [isCropping, setIsCropping] = useState(false);

    const imageRef = useRef<HTMLImageElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    // Sürükleme state'i — ref kullanıyoruz çünkü render tetiklememesi yeterli
    const dragRef = useRef<{ active: boolean; startX: number; startY: number; startOffX: number; startOffY: number }>({
        active: false, startX: 0, startY: 0, startOffX: 0, startOffY: 0,
    });
    const pinchRef = useRef<{ lastDist: number | null }>({ lastDist: null });
    const offsetRef = useRef(offset);
    const scaleRef = useRef(scale);

    // ref'leri state ile senkron tut (touchmove handler'ı closure'dan okur)
    useEffect(() => { offsetRef.current = offset; }, [offset]);
    useEffect(() => { scaleRef.current = scale; }, [scale]);

    // Object URL oluştur ve temizle
    useEffect(() => {
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // touchmove passive:false kaydı (Capacitor/Android için zorunlu)
    useEffect(() => {
        const el = overlayRef.current;
        if (!el) return;

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();

            if (e.touches.length === 1) {
                // Tek parmak: sürükle
                if (!dragRef.current.active) return;
                const newOffX = e.touches[0].clientX - dragRef.current.startX + dragRef.current.startOffX;
                const newOffY = e.touches[0].clientY - dragRef.current.startY + dragRef.current.startOffY;
                setOffset({ x: newOffX, y: newOffY });
            } else if (e.touches.length === 2) {
                // İki parmak: pinch zoom
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                if (pinchRef.current.lastDist !== null) {
                    const ratio = dist / pinchRef.current.lastDist;
                    setScale(prev => Math.min(8, Math.max(0.3, prev * ratio)));
                }
                pinchRef.current.lastDist = dist;
            }
        };

        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        return () => el.removeEventListener('touchmove', handleTouchMove);
    }, []);

    // Resim yüklenince doğal boyutu al, başlangıç scale'i ayarla
    const handleImageLoad = () => {
        const img = imageRef.current;
        if (!img) return;
        const natW = img.naturalWidth;
        const natH = img.naturalHeight;
        setNaturalSize({ w: natW, h: natH });
        setScale(computeInitialScale(natW, natH, CROP_H));
        setOffset({ x: 0, y: 0 });
    };

    // ── Mouse events ────────────────────────────────────────────────────────
    const handleMouseDown = (e: React.MouseEvent) => {
        dragRef.current = {
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            startOffX: offsetRef.current.x,
            startOffY: offsetRef.current.y,
        };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragRef.current.active) return;
        setOffset({
            x: e.clientX - dragRef.current.startX + dragRef.current.startOffX,
            y: e.clientY - dragRef.current.startY + dragRef.current.startOffY,
        });
    };

    const handleMouseUp = () => { dragRef.current.active = false; };

    // ── Touch events ────────────────────────────────────────────────────────
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            dragRef.current = {
                active: true,
                startX: e.touches[0].clientX,
                startY: e.touches[0].clientY,
                startOffX: offsetRef.current.x,
                startOffY: offsetRef.current.y,
            };
            pinchRef.current.lastDist = null;
        } else {
            dragRef.current.active = false;
        }
    };

    const handleTouchEnd = () => {
        dragRef.current.active = false;
        pinchRef.current.lastDist = null;
    };

    // ── Mouse wheel zoom ─────────────────────────────────────────────────────
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        setScale(prev => Math.min(8, Math.max(0.3, prev * factor)));
    };

    // ── Canvas kırpma ────────────────────────────────────────────────────────
    const handleCrop = () => {
        const img = imageRef.current;
        if (!img || naturalSize.w === 0) return;

        setIsCropping(true);

        const viewW = window.innerWidth;
        const viewH = window.innerHeight;

        // Resimdeki sol-üst köşe viewport'ta nerede?
        const imgLeft = viewW / 2 + offset.x - (naturalSize.w * scale) / 2;
        const imgTop  = viewH / 2 + offset.y - (naturalSize.h * scale) / 2;

        // Kırpma çerçevesinin sol-üst köşesi viewport'ta nerede?
        const cropLeft = viewW / 2 - CROP_W / 2;
        const cropTop  = viewH / 2 - CROP_H / 2;

        // Kırpma çerçevesini doğal resim piksellerine çevir
        const srcX = (cropLeft - imgLeft) / scale;
        const srcY = (cropTop  - imgTop)  / scale;
        const srcW = CROP_W / scale;
        const srcH = CROP_H / scale;

        // Yüksek çözünürlük çıktısı için canvas 2× boyut
        const outW = CROP_W * 2;
        const outH = CROP_H * 2;
        const canvas = document.createElement('canvas');
        canvas.width  = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

        canvas.toBlob((blob) => {
            if (!blob) { setIsCropping(false); return; }
            const croppedFile = new File([blob], file.name, { type: 'image/jpeg' });
            onCrop(croppedFile);
        }, 'image/jpeg', 0.92);
    };

    const cropFrameStyle: React.CSSProperties = {
        position: 'absolute',
        width: CROP_W,
        height: CROP_H,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        border: '2px solid rgba(255,255,255,0.9)',
        borderRadius: 8,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
        pointerEvents: 'none',
        zIndex: 2,
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 99999,
                backgroundColor: '#000',
                display: 'flex',
                flexDirection: 'column',
                userSelect: 'none',
            }}
        >
            {/* ── Header ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                paddingTop: 'max(12px, env(safe-area-inset-top))',
                flexShrink: 0,
                zIndex: 3,
            }}>
                <button
                    onClick={onCancel}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none', borderRadius: 20, padding: '8px 14px',
                        color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    }}
                >
                    <X size={16} /> Vazgeç
                </button>
                <p style={{ color: '#f97316', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                    Fotoğrafı Kırp
                </p>
                <button
                    onClick={handleCrop}
                    disabled={isCropping || naturalSize.w === 0}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: isCropping || naturalSize.w === 0 ? '#475569' : '#ea580c',
                        border: 'none', borderRadius: 20, padding: '8px 14px',
                        color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    }}
                >
                    <Check size={16} /> {isCropping ? 'Kırpılıyor...' : 'Kırp ve Ekle'}
                </button>
            </div>

            {/* ── İpucu metni ── */}
            <p style={{
                textAlign: 'center', color: '#94a3b8', fontSize: 12,
                margin: '0 0 8px', flexShrink: 0, zIndex: 3,
            }}>
                Sahalar sayfasında tam bu boyutta görünecek
            </p>

            {/* ── Görüntü alanı ── */}
            <div
                ref={overlayRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
                style={{
                    flex: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'grab',
                    touchAction: 'none',
                }}
            >
                {/* Kırpma çerçevesi */}
                <div style={cropFrameStyle}>
                    {/* Köşe işaretleri */}
                    {[
                        { top: -2, left: -2, borderTop: '3px solid #f97316', borderLeft: '3px solid #f97316' },
                        { top: -2, right: -2, borderTop: '3px solid #f97316', borderRight: '3px solid #f97316' },
                        { bottom: -2, left: -2, borderBottom: '3px solid #f97316', borderLeft: '3px solid #f97316' },
                        { bottom: -2, right: -2, borderBottom: '3px solid #f97316', borderRight: '3px solid #f97316' },
                    ].map((s, i) => (
                        <div key={i} style={{ position: 'absolute', width: 16, height: 16, borderRadius: 1, ...s }} />
                    ))}
                </div>

                {/* Resim */}
                {objectUrl && (
                    <img
                        ref={imageRef}
                        src={objectUrl}
                        alt="Kırp"
                        onLoad={handleImageLoad}
                        draggable={false}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
                            transformOrigin: 'center center',
                            maxWidth: 'none',
                            zIndex: 1,
                            pointerEvents: 'none',
                        }}
                    />
                )}
            </div>

            {/* ── Alt boşluk (safe area) ── */}
            <div style={{ flexShrink: 0, height: 'max(16px, env(safe-area-inset-bottom))' }} />
        </div>
    );
};

export const ImageCropModal: React.FC<ImageCropModalProps> = (props) => {
    useModalBodyClass(true);
    return ReactDOM.createPortal(
        <ImageCropModalContent {...props} />,
        document.body
    );
};
