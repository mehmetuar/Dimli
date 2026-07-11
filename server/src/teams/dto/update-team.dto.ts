import { IsOptional, IsString, Matches } from 'class-validator';

// PATCH /teams/:id beyaz listesi. Daha önce controller'da inline anonim tip
// kullanılıyordu → global ValidationPipe hiçbir alanı doğrulamıyordu.
// logoUrl null olabilir (logo temizleme akışı) — @IsOptional null'u da geçirir.
export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'primaryColor #RRGGBB formatında olmalı',
  })
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'secondaryColor #RRGGBB formatında olmalı',
  })
  secondaryColor?: string;
}
