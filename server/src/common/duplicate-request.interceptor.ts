import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, lastValueFrom } from 'rxjs';
import * as crypto from 'crypto';

interface ReqLike {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  originalUrl?: string;
  url?: string;
  user?: { id?: string };
  ip?: string;
  body?: unknown;
}

// Aynı kullanıcının/cihazın hızlı çift/üçlü tıklamasında aynı mutasyon isteğinin backend'de
// İKİ KEZ çalışmasını önler → çift kayıt VE çift bildirim olmaz (handler tam bir kez çalışır).
// Duplicate, handler'ı tekrar çalıştırmadan İLK isteğin sonucunu (aynı yanıtı) alır → 409 yok,
// client hata görmez, client değişikliği gerekmez.
//
// In-memory store (tek Render instance varsayımı; yatay ölçekte Redis'e taşınmalı). main.ts'te
// app.useGlobalInterceptors ile global kaydedilir → tüm HTTP mutasyon uçları otomatik kapsanır.
@Injectable()
export class DuplicateRequestInterceptor implements NestInterceptor {
  // key → devam eden/az önce biten isteğin promise'i (aynı yanıtı duplicate'e döndürmek için).
  private readonly inflight = new Map<string, Promise<unknown>>();
  // Başarılı bir istekten SONRA anahtarın tutulacağı süre (in-flight + bu pencere = çift-tıklama kapsamı).
  private readonly TTL_MS = 5000;
  private readonly METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
  // TekilleştirilMEYECEK yollar:
  //  - sohbet mesajı: kullanıcı meşru olarak aynı mesajı ("ok" "ok") arka arkaya gönderebilir
  //    (zaten client tarafında çift-gönderim guard'ı var).
  //  - dosya yükleme: multipart gövde hash'i uygun değil.
  private readonly SKIP = [
    /^\/chat\/channels\/[^/]+\/messages\/?$/,
    /^\/files\/upload\/?$/,
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<ReqLike>();
    if (!this.shouldGuard(req)) return next.handle();

    const key = this.buildKey(req);
    const existing = this.inflight.get(key);
    if (existing) {
      // Duplicate → handler'ı ÇALIŞTIRMA, ilk isteğin sonucunu (aynı yanıtı) döndür.
      return from(existing);
    }

    // Handler'ı BİR KEZ çalıştır (lastValueFrom tek abonelik → tek çalıştırma).
    const p = lastValueFrom(next.handle(), { defaultValue: undefined });
    this.inflight.set(key, p);
    p.then(
      () => setTimeout(() => this.inflight.delete(key), this.TTL_MS),
      () => this.inflight.delete(key), // hata → hemen sil (kullanıcının gerçek yeniden denemesi engellenmesin)
    );
    return from(p);
  }

  private shouldGuard(req: ReqLike): boolean {
    const method = (req.method || '').toUpperCase();
    if (!this.METHODS.has(method)) return false;
    const contentType = String(req.headers?.['content-type'] || '');
    if (contentType.includes('multipart/')) return false;
    const path = this.getPath(req);
    if (this.SKIP.some((re) => re.test(path))) return false;
    return true;
  }

  private getPath(req: ReqLike): string {
    const url = req.originalUrl || req.url || '';
    return url.split('?')[0];
  }

  private buildKey(req: ReqLike): string {
    const actor = req.user?.id || req.ip || 'anon';
    const method = (req.method || '').toUpperCase();
    const path = this.getPath(req);
    const bodyHash = crypto
      .createHash('sha1')
      .update(this.stableStringify(req.body ?? {}))
      .digest('hex');
    return `${actor}|${method}|${path}|${bodyHash}`;
  }

  // Anahtar sırasından bağımsız kararlı JSON → çift tıklamada aynı gövde her zaman aynı hash üretir.
  private stableStringify(value: unknown): string {
    const seen = new WeakSet<object>();
    const norm = (v: unknown): unknown => {
      if (v === null || typeof v !== 'object') return v;
      if (seen.has(v)) return null;
      seen.add(v);
      if (Array.isArray(v)) return v.map(norm);
      const obj = v as Record<string, unknown>;
      return Object.keys(obj)
        .sort()
        .reduce((acc: Record<string, unknown>, k) => {
          acc[k] = norm(obj[k]);
          return acc;
        }, {});
    };
    try {
      return JSON.stringify(norm(value));
    } catch {
      return '';
    }
  }
}
