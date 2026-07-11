import { Injectable } from '@nestjs/common';

// Dashboard agregatları için basit in-memory TTL cache (bağımlılıksız). Sadece
// statistics/deletion-report. Mutasyon servisleri bust(key) ile invalidate eder.
@Injectable()
export class AdminStatsCacheService {
  private statsCache = new Map<string, { at: number; data: unknown }>();
  private readonly STATS_TTL_MS = 60_000;

  async cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = this.statsCache.get(key);
    if (hit && Date.now() - hit.at < this.STATS_TTL_MS) return hit.data as T;
    const data = await fn();
    this.statsCache.set(key, { at: Date.now(), data });
    return data;
  }

  bust(key: string): void {
    this.statsCache.delete(key);
  }
}
