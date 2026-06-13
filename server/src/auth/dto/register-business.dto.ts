import { IsString, IsEmail, IsNotEmpty, IsOptional, IsNumber, IsArray, ValidateNested, IsPhoneNumber } from 'class-validator';
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
}
