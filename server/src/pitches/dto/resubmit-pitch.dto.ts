import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { UpdatePitchDto } from './update-pitch.dto';
import { TimeSlotDto } from './time-slot.dto';

// Reddedilen sahayı düzenleyip yeniden onaya gönderme: update alanları + timeSlots.
// Sunucu approvalStatus'ü 'pending'e çeker; businessId burada da yoktur.
export class ResubmitPitchDto extends UpdatePitchDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots?: TimeSlotDto[];
}
