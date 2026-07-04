// Geo yardımcıları — bounding-box ön-filtresi tüm konum bazlı liste
// sorgularında ortak kullanılır (işletmeler + maç ilanları). Tek kaynak:
// kopya matematik tutulmaz (bkz. agent.md tek-kaynak kuralı).

// Bounding-box (indeksli lat/lng aralığı) ile aday kümeyi daralt; kesin
// filtre yine Haversine ile yapılır.
export function computeBoundingBox(lat: number, lng: number, radiusKm: number) {
  // %10 güvenlik payı: kutu, yarıçap çemberini kesin kapsasın (kesin filtre yine
  // Haversine ile yapılır) — sınırdaki hiçbir işletme yanlışlıkla elenmesin.
  const margin = 1.1;
  const latDelta = (radiusKm * margin) / 111.32; // ~km/derece (enlem)
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const lngDelta =
    (radiusKm * margin) / (111.32 * Math.max(0.01, Math.abs(cosLat)));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}
