import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import Cropper, { Area, Point } from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { useModalBodyClass } from '../../utils/useModalBodyClass';
import { getCroppedImg } from '../../utils/cropImage';

// Jest motoru react-easy-crop: odak noktalı pinch-zoom, tek parmak kaydırma,
// restrictPosition ile sınır garantisi (görüntü çerçeveyi hep kaplar),
// minZoom=1 = sığdırma görünümü (zoom-out her zaman başlangıca döner).
// Çıktı üretimi: utils/cropImage.getCroppedImg (JPEG, upscale yok).

interface ImageCropModalProps {
    file: File;
    onCrop: (croppedFile: File) => void;
    onCancel: () => void;
    aspectRatio?: number;              // varsayılan 16/9 (işletme/saha fotoğrafları)
    cropShape?: 'rect' | 'round';      // 'round': profil/takım logosu — çıktı yine kare dosya
    title?: string;
    outputWidth?: number;              // varsayılan: kare 800, diğer 1280
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

const iconButtonStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: 12,
    color: '#e2e8f0',
    cursor: 'pointer',
    flexShrink: 0,
};

const ImageCropModalContent: React.FC<ImageCropModalProps> = ({
    file,
    onCrop,
    onCancel,
    aspectRatio = 16 / 9,
    cropShape = 'rect',
    title = 'Fotoğrafı Kırp',
    outputWidth,
}) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isReady, setIsReady] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const pixelsRef = useRef<Area | null>(null);

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const handleCropComplete = useCallback((_: Area, areaPixels: Area) => {
        pixelsRef.current = areaPixels;
        setIsReady(true);
    }, []);

    const handleReset = () => {
        setZoom(1);
        setCrop({ x: 0, y: 0 });
    };

    const handleSave = async () => {
        if (!pixelsRef.current || !objectUrl || isProcessing) return;
        setIsProcessing(true);
        setErrorMsg(null);
        try {
            const resolvedWidth = outputWidth ?? (aspectRatio === 1 ? 800 : 1280);
            const cropped = await getCroppedImg(objectUrl, pixelsRef.current, file.name, resolvedWidth);
            // isProcessing resetlenmez — tüketici onCrop içinde modalı unmount eder (flash olmasın).
            onCrop(cropped);
        } catch {
            setIsProcessing(false);
            setErrorMsg('Fotoğraf kırpılamadı, tekrar deneyin.');
        }
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
                padding: '12px 16px',
                paddingTop: 'max(16px, env(safe-area-inset-top))',
                flexShrink: 0,
                gap: 12,
            }}>
                <button onClick={onCancel} style={iconButtonStyle} aria-label="Kapat">
                    <X size={20} />
                </button>
                <p style={{
                    flex: 1,
                    textAlign: 'center',
                    color: '#f97316',
                    fontWeight: 800,
                    fontSize: 14,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {title}
                </p>
                {/* Başlığı ortalamak için X butonuyla eş genişlikte boşluk */}
                <div style={{ width: 44, flexShrink: 0 }} />
            </div>

            {/* ── Kırpma alanı ── */}
            <div style={{ flex: 1, position: 'relative' }}>
                {objectUrl && (
                    <Cropper
                        image={objectUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio}
                        cropShape={cropShape}
                        showGrid={cropShape === 'rect'}
                        minZoom={MIN_ZOOM}
                        maxZoom={MAX_ZOOM}
                        restrictPosition
                        zoomWithScroll
                        objectFit="contain"
                        onCropChange={setCrop}
                        onZoomChange={z => setZoom(clampZoom(z))}
                        onCropComplete={handleCropComplete}
                        style={{
                            cropAreaStyle: {
                                border: '2px solid rgba(255,255,255,0.9)',
                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
                            },
                        }}
                    />
                )}
            </div>

            {/* ── Footer ── */}
            <div style={{
                flexShrink: 0,
                padding: '12px 16px',
                paddingBottom: 'max(16px, var(--safe-bottom))',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                background: 'rgba(0,0,0,0.85)',
            }}>
                {errorMsg && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        color: '#f87171', fontSize: 13, fontWeight: 600,
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 12, padding: '10px 12px',
                    }}>
                        <AlertCircle size={16} style={{ flexShrink: 0 }} /> {errorMsg}
                    </div>
                )}

                {/* Zoom kontrolü */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44 }}>
                    <button
                        onClick={() => setZoom(z => clampZoom(z - ZOOM_STEP))}
                        style={iconButtonStyle}
                        aria-label="Uzaklaştır"
                    >
                        <ZoomOut size={20} />
                    </button>
                    <input
                        type="range"
                        min={MIN_ZOOM}
                        max={MAX_ZOOM}
                        step={0.01}
                        value={zoom}
                        onChange={e => setZoom(clampZoom(Number(e.target.value)))}
                        className="crop-zoom-slider"
                        style={{ flex: 1 }}
                        aria-label="Yakınlaştırma"
                    />
                    <button
                        onClick={() => setZoom(z => clampZoom(z + ZOOM_STEP))}
                        style={iconButtonStyle}
                        aria-label="Yakınlaştır"
                    >
                        <ZoomIn size={20} />
                    </button>
                </div>

                {/* Sıfırla */}
                <button
                    onClick={handleReset}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        background: 'none', border: 'none',
                        color: '#94a3b8', fontSize: 13, fontWeight: 700,
                        padding: '6px 12px', cursor: 'pointer', alignSelf: 'center',
                        minHeight: 32,
                    }}
                >
                    <RotateCcw size={14} /> Sıfırla
                </button>

                {/* Aksiyonlar */}
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={onCancel}
                        disabled={isProcessing}
                        style={{
                            flex: 1,
                            height: 50,
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none', borderRadius: 14,
                            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                            opacity: isProcessing ? 0.5 : 1,
                        }}
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isProcessing || !isReady}
                        style={{
                            flex: 2,
                            height: 50,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            background: isProcessing || !isReady ? '#475569' : '#ea580c',
                            border: 'none', borderRadius: 14,
                            color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                        }}
                    >
                        {isProcessing ? (
                            <>
                                <span style={{
                                    width: 18, height: 18, borderRadius: '50%',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: '#fff',
                                    animation: 'spin 0.8s linear infinite',
                                    display: 'inline-block',
                                }} />
                                Kaydediliyor...
                            </>
                        ) : (
                            <>
                                <Check size={18} /> Kaydet
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Slider + spinner stilleri (modal document.body'ye portal'landığı için lokal <style>) */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .crop-zoom-slider {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 44px;
                    background: transparent;
                }
                .crop-zoom-slider::-webkit-slider-runnable-track {
                    height: 4px;
                    border-radius: 2px;
                    background: rgba(255,255,255,0.25);
                }
                .crop-zoom-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: #f97316;
                    border: 3px solid #fff;
                    margin-top: -10px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                }
            `}</style>
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
