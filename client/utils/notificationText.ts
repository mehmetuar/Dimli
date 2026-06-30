// Bildirim metinlerinden dekoratif emoji/ikonları temizler. Sunucu YENİ bildirimleri
// zaten emoji'siz üretir; bu yardımcı, eski/tarihsel kayıtlarda kalan emoji'leri de
// uygulama içinde gizler ("her yerde temiz" kararı).
//
// NOT: Regex 'u' (unicode) bayrağı KULLANMAZ: eski/MIUI WebView'lar `\p{...}` ve bazen
// `u` bayrağını desteklemez ve parse-time SyntaxError fırlatıp uygulamayı kırabilir.
// Bu yüzden emoji surrogate çiftleri (\uD800-\uDBFF + \uDC00-\uDFFF) ve BMP sembol
// aralıkları açıkça, ES5-uyumlu \uXXXX kaçışlarıyla taranır.
export const stripNotificationEmoji = (text?: string | null): string => {
  if (!text) return '';
  return text
    .replace(/[←-⇿⌀-➿⤀-⥿⬀-⯿]/g, '') // oklar, teknik/dingbat semboller (⏳ ⚠ ✅ ❌ ⚽ ⚡ …)
    .replace(/[︀-️]/g, '') // variation selector'lar
    .replace(/‍/g, '') // zero-width joiner
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // astral emoji (🌟 🏆 💬 📩 🕒 …)
    .replace(/ {2,}/g, ' ')
    .trim();
};
