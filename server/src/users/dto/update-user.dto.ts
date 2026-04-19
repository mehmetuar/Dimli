
import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

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
}
