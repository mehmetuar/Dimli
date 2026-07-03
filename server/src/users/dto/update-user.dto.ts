import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsNumber,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  normalizeUsername,
  USERNAME_REGEX,
  USERNAME_INVALID_MESSAGE,
} from '../username.util';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeUsername(value) : value,
  )
  @IsString()
  @Matches(USERNAME_REGEX, { message: USERNAME_INVALID_MESSAGE })
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
