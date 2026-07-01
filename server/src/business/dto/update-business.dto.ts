import { IsNumber, IsOptional, IsString } from 'class-validator';

// İşletme sahibinin kendi işletmesini güncellerken yazabileceği ALANLARIN beyaz listesi.
// Global ValidationPipe(whitelist:true) sayesinde bu DTO'da olmayan alanlar (status,
// deletedAt, rejectionReason, rating vb.) istekten otomatik ayıklanır → sahip kendini
// onaysız 'active' yapamaz. Client (BusinessInfoSettings) yalnız bu 6 alanı gönderir.
export class UpdateBusinessDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
