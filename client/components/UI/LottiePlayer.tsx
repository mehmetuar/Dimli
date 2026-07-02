import React, { Suspense, lazy, useEffect, useState } from 'react';
import type { LottiePlayerProps } from './LottiePlayerInner';

const Inner = lazy(() => import('./LottiePlayerInner'));

/** prefers-reduced-motion'ı canlı izler (kullanıcı ayarı değişirse günceller) */
function usePrefersReducedMotion(): boolean {
    const [reduce, setReduce] = useState<boolean>(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = () => setReduce(mq.matches);
        mq.addEventListener?.('change', onChange);
        return () => mq.removeEventListener?.('change', onChange);
    }, []);
    return reduce;
}

/**
 * Uygulama geneli tek Lottie giriş noktası. Tüm animasyonlar bunun üzerinden gösterilir.
 * - lottie-web'i React.lazy ile ayrı chunk'a alır (main/auth bundle şişmez).
 * - prefers-reduced-motion açıksa lottie chunk'ı HİÇ yüklemez → doğrudan fallback (erişilebilirlik).
 * - Yüklenene kadar Suspense fallback = statik fallback (dikişsiz yer tutucu).
 */
export const LottiePlayer: React.FC<LottiePlayerProps> = (props) => {
    const reduce = usePrefersReducedMotion();
    if (reduce) return <>{props.fallback ?? null}</>;
    return (
        <Suspense fallback={<>{props.fallback ?? null}</>}>
            <Inner {...props} />
        </Suspense>
    );
};

export type { LottiePlayerProps };
