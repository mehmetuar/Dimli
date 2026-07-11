import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

// Takım oluşturma beyaz listesi. captainId ve fairPlayScore burada YOK →
// ValidationPipe(whitelist:true) ile istemciden gelmeleri engellenir; captain sunucuda
// JWT kullanıcısından, fairPlayScore entity default'undan set edilir.
export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  level?: string;

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

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
