import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { TimeSlotDto } from './time-slot.dto';

export class UpdateClosedDaysDto {
  @IsArray()
  @IsString({ each: true })
  closedDays: string[];
}

export class SetTimeSlotsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  slots: TimeSlotDto[];
}
