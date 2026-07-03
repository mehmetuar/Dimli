import { describe, it, expect, beforeAll } from '@jest/globals';
import { ReverseGeocodeService } from './reverse-geocode.service';

describe('ReverseGeocodeService (offline il/ilçe)', () => {
  let service: ReverseGeocodeService;

  beforeAll(() => {
    service = new ReverseGeocodeService();
    service.onModuleInit(); // GeoJSON'u belleğe yükler
  });

  it('İstanbul ilçelerini doğru çözer', () => {
    expect(service.lookup(41.0422, 29.0067)).toEqual({
      province: 'İstanbul',
      district: 'Beşiktaş',
    });
    expect(service.lookup(41.0817, 28.9744)).toEqual({
      province: 'İstanbul',
      district: 'Kağıthane',
    });
    expect(service.lookup(40.9819, 29.0256)).toEqual({
      province: 'İstanbul',
      district: 'Kadıköy',
    });
  });

  it('Diğer illerin ilçelerini çözer', () => {
    expect(service.lookup(39.9208, 32.8541)).toEqual({
      province: 'Ankara',
      district: 'Çankaya',
    });
    expect(service.lookup(38.4189, 27.1287)).toEqual({
      province: 'İzmir',
      district: 'Konak',
    });
  });

  it('Türkiye dışı / geçersiz koordinatta null döner', () => {
    expect(service.lookup(51.5074, -0.1278)).toBeNull(); // Londra
    expect(service.lookup(NaN, NaN)).toBeNull();
    expect(service.lookup(0, 0)).toBeNull(); // Atlantik/Gine Körfezi
  });
});
