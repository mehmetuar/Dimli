import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ValidatePromoCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;
}
