import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSupportTicketDto {
  @IsString()
  @MaxLength(40)
  category: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;
}
