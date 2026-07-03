import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import type { MultiPolygon, Polygon } from 'geojson';
import * as fs from 'fs';
import * as path from 'path';

// GeoJSON koordinat tipleri (Position = [lng, lat])
type Position = number[];
interface Geometry {
  type: 'Polygon' | 'MultiPolygon';
  // Polygon: ring[] (Position[][]) — MultiPolygon: polygon[] (Position[][][])
  coordinates: Position[][] | Position[][][];
}

interface RawFeature {
  properties?: { ilce?: string; il?: string };
  geometry?: Geometry;
}

interface DistrictFeature {
  ilce: string;
  il: string;
  geometry: Geometry;
  // [minLng, minLat, maxLng, maxLat] — indexed pre-filter before the exact point-in-polygon test
  bbox: [number, number, number, number];
}

/**
 * Koordinat → Türkiye il/ilçe çözümlemesi, TAMAMEN OFFLINE (harici geocoder/ücret YOK).
 * OSM admin_level=6 ilçe sınırları (ODbL) tek seferlik belleğe yüklenir; her sorgu
 * bbox ön-filtresi + @turf point-in-polygon ile birkaç yüz mikrosaniyede döner.
 * Ölçekten bağımsız (milyonlarca kullanıcıda dahi çağrı başına 0 maliyet).
 */
@Injectable()
export class ReverseGeocodeService implements OnModuleInit {
  private readonly logger = new Logger(ReverseGeocodeService.name);
  private features: DistrictFeature[] = [];

  onModuleInit(): void {
    try {
      // __dirname: dev'de src/geo, prod'da dist/geo (nest-cli assets ile kopyalanır)
      const file = path.join(__dirname, 'turkey-districts.geojson');
      const gj = JSON.parse(fs.readFileSync(file, 'utf8')) as {
        features?: RawFeature[];
      };
      for (const f of gj.features ?? []) {
        if (!f?.geometry || !f.properties?.ilce) continue;
        this.features.push({
          ilce: f.properties.ilce,
          il: f.properties.il ?? '',
          geometry: f.geometry,
          bbox: this.computeBbox(f.geometry),
        });
      }
      this.logger.log(
        `Offline reverse-geocode hazır: ${this.features.length} ilçe poligonu yüklendi`,
      );
    } catch (e: any) {
      // Veri yüklenemezse servis "null" döner; konum PATCH'leri koordinatı yine kaydeder,
      // yalnızca ilçe türetilemez (mevcut location korunur). Uygulama çökmez.
      this.logger.error(`İlçe veri seti yüklenemedi: ${e?.message ?? e}`);
      this.features = [];
    }
  }

  /**
   * Verilen enlem/boylamın düştüğü Türkiye ilçesini döndürür.
   * Türkiye dışı / deniz / geçersiz koordinatta `null` (çağıran son bilinen ilçeyi korur).
   */
  lookup(
    lat: number,
    lng: number,
  ): { province: string; district: string } | null {
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      this.features.length === 0
    ) {
      return null;
    }
    for (const f of this.features) {
      const b = f.bbox;
      if (lng < b[0] || lng > b[2] || lat < b[1] || lat > b[3]) continue; // bbox ön-filtre
      try {
        if (
          booleanPointInPolygon(
            [lng, lat],
            f.geometry as unknown as Polygon | MultiPolygon,
          )
        ) {
          return { province: f.il, district: f.ilce };
        }
      } catch {
        // bozuk geometriyi atla
      }
    }
    return null;
  }

  private computeBbox(geometry: Geometry): [number, number, number, number] {
    // Polygon → ring'leri tek düzeye indir; MultiPolygon → iki düzey → Position listesi
    const positions: Position[] =
      geometry.type === 'Polygon'
        ? (geometry.coordinates as Position[][]).flat()
        : (geometry.coordinates as Position[][][]).flat(2);
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const [lng, lat] of positions) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return [minLng, minLat, maxLng, maxLat];
  }
}
