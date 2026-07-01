import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
