// Türkiye'de 2016'dan beri DST yok — UTC+3 sabit. Bu yüzden "kullanıcının
// uygulamada seçtiği saat" (İstanbul yerel saati) ile mutlak zaman arasındaki
// dönüşümü process.env.TZ'ye hiç bakmadan, sabit ofsetle yapıyoruz. Process'in
// yerel saatine güvenmek (new Date().setHours()/.getHours()) hem ortama göre
// (Render container TZ'si) hem main.ts'teki process.env.TZ ayarına göre
// değişken sonuç verir — bu modüldeki tüm maç/randevu saat hesaplamaları
// bu yüzden bu sabit ofset yardımcılarını kullanmalı.
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * "YYYY-MM-DD" + "HH:mm" (İstanbul yerel saati niyetiyle) → doğru mutlak Date.
 */
export function istanbulDateTimeToUtc(dateStr: string, time: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(
    Date.UTC(year, month - 1, day, hours, minutes || 0) - ISTANBUL_OFFSET_MS,
  );
}

/**
 * Şu anki anı İstanbul yerel takvim günü/saat/dakika olarak döner.
 */
export function nowInIstanbul(): {
  dateStr: string;
  hours: number;
  minutes: number;
} {
  const iso = new Date(Date.now() + ISTANBUL_OFFSET_MS).toISOString();
  return {
    dateStr: iso.slice(0, 10),
    hours: Number(iso.slice(11, 13)),
    minutes: Number(iso.slice(14, 16)),
  };
}
