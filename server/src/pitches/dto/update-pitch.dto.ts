import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

// Saha güncelleme beyaz listesi (kısmi). businessId ve timeSlots içermez; hassas alanlar
// (approvalStatus/rejectionReason/reviewedAt/deletedAt) yoktur → whitelist ile ayıklanır.
export class UpdatePitchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string; // 'INDOOR' | 'OUTDOOR'

  @IsOptional()
  @IsNumber()
  pricePerHour?: number;

  @IsOptional()
  @IsString()
  openTime?: string;

  @IsOptional()
  @IsString()
  closeTime?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  closedDays?: string[];
}
