import { IsNotEmpty, IsString } from 'class-validator';

export class TimeSlotDto {
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;
}
