// RevenueCat webhook gövdesi. DIŞ/canlı bir sözleşme olduğu ve gerçek event çoğunlukla
// `{ event: {...} }` içinde iç içe geldiği için, katı bir class-DTO + whitelist yerine
// gevşek bir interface kullanılır (whitelist stripping `event`'i düşürüp entegrasyonu
// bozmasın). Kimlik doğrulaması header imzasıyla (REVENUECAT_WEBHOOK_SECRET) yapılır.
export interface RevenueCatWebhookPayload {
  event?: RevenueCatWebhookPayload;
  type?: string;
  app_user_id?: string;
  expiration_at_ms?: number | string;
  [key: string]: unknown;
}
