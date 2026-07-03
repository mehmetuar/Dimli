import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  MinLength,
  IsDateString,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  normalizeUsername,
  USERNAME_REGEX,
  USERNAME_INVALID_MESSAGE,
} from '../username.util';

export class CreateUserDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeUsername(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(USERNAME_REGEX, { message: USERNAME_INVALID_MESSAGE })
  username: string;

  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsDateString()
  @IsOptional()
  birthDate?: Date;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsString()
  @IsOptional()
  secondaryPosition?: string;

  @IsString()
  @IsOptional()
  foot?: string;

  // Uyruk (ISO alpha-2, örn. 'TR'). Zorunluluk client UI'da; server default'la
  // geri-uyumlu (boş gelirse entity default 'TR').
  @IsString()
  @IsOptional()
  nationality?: string;
}
