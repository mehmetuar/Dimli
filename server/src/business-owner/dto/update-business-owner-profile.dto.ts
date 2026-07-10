import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// İşletme sahibinin (yetkili) kendi profil bilgilerini güncellerken yazabileceği
// ALANLARIN beyaz listesi. Telefon BİLEREK yok — salt-okunur (OTP ile doğrulanmış,
// benzersizlik kilidi). Global ValidationPipe(whitelist:true) fazladan alanları ayıklar.
export class UpdateBusinessOwnerProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;
}
