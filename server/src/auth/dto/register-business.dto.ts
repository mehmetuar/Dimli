import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

class RegisterBusinessOwnerDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

class RegisterTimeSlotDto {
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;
}

class RegisterBusinessDetailsDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  district: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @IsString()
  @IsOptional()
  openTime?: string;

  @IsString()
  @IsOptional()
  closeTime?: string;

  // Müşteri listesindeki işletme kartı görseli. Yeni istemci sürümü zorunlu tutar;
  // sahadaki eski mobil binary'ler göndermediği için sunucuda @IsOptional kalmalı
  // (tüm kullanıcılar güncellenince @IsNotEmpty yapılabilir).
  @IsString()
  @IsOptional()
  coverImageUrl?: string;
}

class RegisterPitchDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  type: string;

  @IsNumber()
  @IsNotEmpty()
  pricePerHour: number;

  @IsString()
  @IsOptional()
  openTime?: string;

  @IsString()
  @IsOptional()
  closeTime?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  facilities?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterTimeSlotDto)
  @IsOptional()
  timeSlots?: RegisterTimeSlotDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  closedDays?: string[];
}

export class RegisterBusinessDto {
  @ValidateNested()
  @Type(() => RegisterBusinessOwnerDto)
  owner: RegisterBusinessOwnerDto;

  @ValidateNested()
  @Type(() => RegisterBusinessDetailsDto)
  business: RegisterBusinessDetailsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterPitchDto)
  pitches: RegisterPitchDto[];

  @IsString()
  @IsOptional()
  planType?: string;

  @IsString()
  @IsOptional()
  revenuecatAnonymousId?: string;

  // Davet/partner kodu — geçerliyse IAP atlanır, ücretsiz (complimentary)
  // abonelik oluşturulur. Global whitelist nedeniyle DTO'da tanımlı olmak
  // ZORUNLU (aksi halde payload'dan strip edilir).
  @IsString()
  @IsOptional()
  @MaxLength(32)
  promoCode?: string;
}
