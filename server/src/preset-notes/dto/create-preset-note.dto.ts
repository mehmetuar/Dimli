import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

// Hem oluşturma hem güncelleme için kullanılır (aynı şekil: sadece metin).
export class CreatePresetNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;
}
