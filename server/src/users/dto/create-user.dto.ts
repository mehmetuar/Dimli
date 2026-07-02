import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  MinLength,
  IsDateString,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
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
