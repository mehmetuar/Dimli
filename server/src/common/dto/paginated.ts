/**
 * Sayfalı liste yanıt zarfı. Tüm admin liste endpoint'leri bunu döner
 * (eski ham dizi yerine). Frontend `items`'ı listeler, `total`'ı sayaç olarak,
 * `totalPages`'i sayfalama kontrolünde kullanır.
 */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): Paginated<T> {
  return {
    items,
    total,
    page,
    limit,
    // Boş sonuçta bile en az 1 → frontend pager "1 / 1" gösterir, "1 / 0" değil.
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
