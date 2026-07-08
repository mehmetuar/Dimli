import { BadRequestException } from '@nestjs/common';

// Not alanları için karakter sınırı doğrulaması — TEK KAYNAK.
// Client ikizi: client/utils/noteLimits.ts + CharCountTextarea (native maxLength).
// Boşluk dahil her karakter 1 sayılır (trim YOK); boş/null not serbest (opsiyonel alan).

export function assertNoteWithinLimit(
  note: string | null | undefined,
  maxChars: number,
  label = 'Not',
): void {
  if (note == null) return;
  if (note.length > maxChars) {
    throw new BadRequestException(
      `${label} en fazla ${maxChars} karakter olabilir.`,
    );
  }
}
