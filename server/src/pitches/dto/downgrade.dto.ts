import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class DowngradePrecheckDto {
  @IsString()
  planType: string;

  @IsArray()
  @IsUUID('4', { each: true })
  pitchIds: string[];
}

export class ScheduleDowngradeDto {
  @IsString()
  planType: string;

  @IsOptional()
  @IsString()
  rcCustomerId?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  pitchIds: string[];
}
