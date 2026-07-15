import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
  ValidateIf,
  IsDateString,
} from 'class-validator';

export class CreatePromoCodesDto {
  // Tek seferde üretilecek kod adedi.
  @IsInt()
  @Min(1)
  @Max(50)
  count: number;

  // Verilen ücretsiz süre (ay). null / gönderilmezse süresiz (ömür boyu).
  // ValidateIf: yalnız null olmayan değerlerde tip kontrolü yapılır.
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(120)
  durationMonths?: number | null;

  @IsInt()
  @Min(1)
  @Max(10000)
  maxRedemptions: number = 1;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  note?: string;

  // Kodun kullanılabildiği son tarih (opsiyonel).
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
