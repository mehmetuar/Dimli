import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: Date;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  secondaryPosition?: string;

  @IsOptional()
  @IsString()
  foot?: string;

  // Uyruk (ISO alpha-2, örn. 'TR') — hesap ayarlarından güncellenebilir.
  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  favoriteBusinessIds?: string[];

  @IsOptional()
  @IsBoolean()
  isJoker?: boolean;

  @IsOptional()
  @IsBoolean()
  sharesFee?: boolean;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
