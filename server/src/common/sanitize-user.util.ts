// Yanıtlarda oyuncu/kaptan/gönderen/katılımcı olarak dönen User kayıtlarındaki
// hassas alanlar (şifre hash'i, telefon, e-posta, push token, GPS, chat-ban) istemciye
// SIZMAMALI. Tek kaynak: bu liste + sanitizeUser. Yeni hassas kolon eklenirse buraya ekle!
//
// Not: `email`/`phone` bir kullanıcının KENDİ kaydını dönerken normaldir (örn.
// GET /users/me) — orada bu util KULLANILMAZ; util yalnız ÇOK-kullanıcılı
// (başkalarının kayıtlarının döndüğü) yanıtlar içindir.
export const SENSITIVE_USER_FIELDS = [
  'password',
  'email',
  'phone',
  'pushToken',
  'latitude',
  'longitude',
  'isChatBanned',
  'chatBannedAt',
  'chatBanExpiry',
  'phoneVerified',
] as const;

// Hassas alanlar "absent" bırakılır (null YAZILMAZ) → bu nesneler yanlışlıkla
// save()'e girse bile eksik key hiçbir UPDATE üretmez.
export function sanitizeUser<T extends object>(user: T): T {
  const copy = { ...user } as Record<string, unknown>;
  for (const key of SENSITIVE_USER_FIELDS) delete copy[key];
  return copy as unknown as T;
}
