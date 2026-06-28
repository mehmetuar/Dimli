import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Liste endpoint'leri için ortak sayfalama + arama query parametreleri.
 * Global ValidationPipe({ transform: true }) sayesinde query string'leri
 * (page=2&limit=20) otomatik number'a çevrilir.
 */
export class PaginationQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  search?: string;
}
