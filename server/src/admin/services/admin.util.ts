import { Brackets, SelectQueryBuilder } from 'typeorm';

export const PLAN_LABELS: Record<string, string> = {
  '1_pitch': 'Starter',
  '2_pitch': 'Basic',
  '3_pitch': 'Pro',
  '4_pitch': 'Business',
  '5plus_pitch': 'Enterprise',
};

// Saha sayısına göre doğru planı belirle
export const PITCH_COUNT_TO_PLAN: Record<
  number,
  { planType: string; pitchCount: number; pricePerMonth: number }
> = {
  0: { planType: '1_pitch', pitchCount: 1, pricePerMonth: 1709.99 },
  1: { planType: '1_pitch', pitchCount: 1, pricePerMonth: 1709.99 },
  2: { planType: '2_pitch', pitchCount: 2, pricePerMonth: 2999.99 },
  3: { planType: '3_pitch', pitchCount: 3, pricePerMonth: 3849.99 },
  4: { planType: '4_pitch', pitchCount: 4, pricePerMonth: 4649.99 },
};

/**
 * QueryBuilder'a ILIKE arama uygular. Brackets ile OR grubu izole edilir —
 * aksi halde `WHERE status = x AND a ILIKE q OR b ILIKE q` diğer statüleri
 * sızdırır. Boş aramada hiçbir şey yapmaz (no-op).
 */
export function applySearch(
  qb: SelectQueryBuilder<any>,
  search: string | undefined,
  columns: string[],
): void {
  if (!search?.trim()) return;
  const term = `%${search.trim()}%`;
  qb.andWhere(
    new Brackets((b) => {
      columns.forEach((col, i) =>
        b.orWhere(`${col} ILIKE :s${i}`, { [`s${i}`]: term }),
      );
    }),
  );
}
