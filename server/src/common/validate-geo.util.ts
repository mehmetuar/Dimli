import { BadRequestException } from '@nestjs/common';

export interface GeoFilter {
  lat: number;
  lng: number;
  radius: number;
}

const DEFAULT_RADIUS = 20;
const MAX_RADIUS = 100;

// Konum bazlı filtreleme tüm müşteri uçlarında zorunlu — koordinat
// eksikse istemcinin hatalı/atlatma amaçlı bir istek attığı anlamına gelir,
// bu yüzden sessizce boş sonuç değil 400 döner.
export function requireGeoFilter(
  lat?: string,
  lng?: string,
  radius?: string,
): GeoFilter {
  const parsedLat = lat !== undefined ? parseFloat(lat) : NaN;
  const parsedLng = lng !== undefined ? parseFloat(lng) : NaN;

  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
    throw new BadRequestException('lat ve lng parametreleri zorunludur');
  }

  const parsedRadius = radius !== undefined ? parseFloat(radius) : DEFAULT_RADIUS;
  const safeRadius = Number.isNaN(parsedRadius)
    ? DEFAULT_RADIUS
    : Math.min(parsedRadius, MAX_RADIUS);

  return { lat: parsedLat, lng: parsedLng, radius: safeRadius };
}
