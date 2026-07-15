import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RedeemPromoCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;
}
