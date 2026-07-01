import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { TimeSlotDto } from './time-slot.dto';

// Saha oluşturma gövdesinin beyaz listesi. approvalStatus/rejectionReason/reviewedAt/
// deletedAt gibi alanlar burada YOK → global ValidationPipe(whitelist:true) ile ayıklanır
// (sahip kendi sahasını 'approved' yapamaz). businessId sahiplik kontrolü için gereklidir.
export class CreatePitchDto {
  @IsUUID()
  businessId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsNumber()
  pricePerHour: number;

  @IsString()
  @IsNotEmpty()
  openTime: string;

  @IsString()
  @IsNotEmpty()
  closeTime: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  closedDays?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots?: TimeSlotDto[];
}
