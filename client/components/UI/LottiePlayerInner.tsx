import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

export interface LottiePlayerProps {
    /** public yol, ör. "/animations/ball-success.json" — runtime fetch, bundle'a girmez */
    src: string;
    loop?: boolean;
    autoplay?: boolean;
    /** Yalnız loop=false iken tetiklenir (tek-sefer animasyon bitince) */
    onComplete?: () => void;
    className?: string;
    style?: React.CSSProperties;
    /** Yüklenene kadar / hata / reduce-motion durumunda gösterilecek statik içerik */
    fallback?: React.ReactNode;
    ariaLabel?: string;
}

/**
 * lottie-react'i (lottie-web) içeren iç komponent. Dışarıdaki LottiePlayer bunu React.lazy ile
 * yükler → lottie-web yalnız bir animasyon gerçekten gösterildiğinde ayrı chunk olarak iner.
 * Animasyon JSON'u src URL'inden runtime fetch edilir (public/), böylece ağır dosyalar JS
 * bundle'ına girmez.
 */
const LottiePlayerInner: React.FC<LottiePlayerProps> = ({
    src,
    loop = false,
    autoplay = true,
    onComplete,
    className,
    style,
    fallback = null,
    ariaLabel = 'Animasyon',
}) => {
    const [data, setData] = useState<unknown>(null);

    useEffect(() => {
        let cancelled = false;
        fetch(src)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((json) => {
                if (!cancelled) setData(json);
            })
            .catch((e) => {
                // fetch hatası → fallback (statik ikon/metin) görünür kalır (dikişsiz düşüş);
                // geliştirici için uyarı (ör. yanlış src yolu / 404 erken yakalansın).
                console.warn(`LottiePlayer: '${src}' yüklenemedi`, e);
            });
        return () => {
            cancelled = true;
        };
    }, [src]);

    // Yüklenene kadar (veya hata) fallback göster (yer tutucu / statik ikon)
    if (!data) return <>{fallback}</>;

    return (
        <div className={className} style={style} role="img" aria-label={ariaLabel}>
            <Lottie
                animationData={data}
                loop={loop}
                autoplay={autoplay}
                onComplete={onComplete}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

export default LottiePlayerInner;
