import { useEffect, useRef } from 'react';

interface UseLongPressOptions {
  onTap?: () => void;
  onLongPress: () => void;
  durationMs?: number;
  moveThreshold?: number;
}

/**
 * Mobil-standart long-press + güvenilir tap ayrımı. React'in synthetic onTouchStart'ının aksine
 * gerçek (native) touch dinleyicileri kullanır:
 *  - touchmove ile hareket eşiği (moveThreshold) aşılırsa long-press iptal → KAYDIRMA options'ı tetiklemez.
 *  - touchend'de long-press tetiklenmediyse VE hareket olmadıysa → tap (güvenilir aç).
 *  - touchcancel → iptal.
 * Masaüstü/simülatör için mouse fallback (dokunuştan türeyen mouse olayları ~700ms yok sayılır → çift-fire yok).
 * Not: touchstart passive:true → preventDefault YOK → liste kaydırması serbest kalır.
 *
 * Elemente dönen ref bağlanır; onClick KULLANILMAZ (tap burada touchend/mouseup ile yakalanır).
 */
export function useLongPress<T extends HTMLElement = HTMLDivElement>({
  onTap,
  onLongPress,
  durationMs = 450,
  moveThreshold = 8,
}: UseLongPressOptions) {
  const ref = useRef<T>(null);
  const onTapRef = useRef(onTap);
  const onLongPressRef = useRef(onLongPress);
  onTapRef.current = onTap;
  onLongPressRef.current = onLongPress;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let firedLong = false;
    let moved = false;
    const start = { x: 0, y: 0 };
    let lastTouchAt = 0;

    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
    };
    const fireLong = () => {
      firedLong = true;
      // Best-effort dokunsal geri bildirim: Android WebView'de titreşir, iOS'ta navigator.vibrate
      // tanımsız → sessiz no-op. Yeni native bağımlılık gerektirmez.
      try {
        navigator.vibrate?.(10);
      } catch {
        /* no-op */
      }
      onLongPressRef.current();
    };
    const begin = (x: number, y: number) => {
      firedLong = false;
      moved = false;
      start.x = x;
      start.y = y;
      clear();
      timer = setTimeout(fireLong, durationMs);
    };
    const track = (x: number, y: number) => {
      if (
        Math.abs(x - start.x) > moveThreshold ||
        Math.abs(y - start.y) > moveThreshold
      ) {
        moved = true;
        clear();
      }
    };
    const finish = () => {
      clear();
      if (!firedLong && !moved) onTapRef.current?.();
    };

    // ── Touch (mobil, birincil) ──
    const onTouchStart = (e: TouchEvent) => {
      lastTouchAt = Date.now();
      const t = e.touches[0];
      begin(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      track(t.clientX, t.clientY);
    };
    const onTouchEnd = () => finish();
    const onTouchCancel = () => {
      moved = true;
      clear();
    };

    // ── Mouse (masaüstü/simülatör) — dokunuştan türeyen mouse olaylarını yok say ──
    const isSynthetic = () => Date.now() - lastTouchAt < 700;
    const onMouseDown = (e: MouseEvent) => {
      if (isSynthetic()) return;
      begin(e.clientX, e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (timer === undefined) return;
      track(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      if (isSynthetic()) return;
      finish();
    };
    const onMouseLeave = () => {
      moved = true;
      clear();
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true });
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mouseleave', onMouseLeave);

    return () => {
      clear();
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [durationMs, moveThreshold]);

  return ref;
}
