import { Module } from '@nestjs/common';
import { ReverseGeocodeService } from './reverse-geocode.service';

/**
 * Offline coğrafi çözümleme (koordinat → il/ilçe). Harici API/ücret yok.
 * ReverseGeocodeService'i inject etmek isteyen modüller bunu import eder.
 */
@Module({
  providers: [ReverseGeocodeService],
  exports: [ReverseGeocodeService],
})
export class GeoModule {}
