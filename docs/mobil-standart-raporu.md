# Dimli Mobil Uygulama — Standart Denetim Raporu

**Tarih:** 7 Temmuz 2026 · **Kapsam:** `client/` (React 19 + Capacitor 6, iOS/Android) + ilgili sunucu yetenekleri
**Sürümler:** iOS 1.3 (build 42) · Android 1.3 (versionCode 28)

---

## 1. Yönetici Özeti

**29 MB endişesi yersiz — eksik paket yok.** iOS'ta görünen 29,4 MB indirme / 36,6 MB kurulum boyutu, Capacitor (webview) mimarili bir uygulama için tamamen normal, hatta *sağlıklı küçüklükte*. Kurulu 12 native eklentinin tamamı aktif kullanımda; ölü ağırlık yok. Boyutun küçük olması bir şeyin eksik olduğunu değil, doğru mimari seçimi (Capacitor) ve iyi bundle optimizasyonunu gösteriyor.

Asıl eksikler boyutta değil, **görünürlük ve yayın hijyeni katmanında**:

| Durum | Özet |
|---|---|
| 🔴 Kritik | Çökme raporlama yok (Sentry/Crashlytics) — üretimde hatalar görünmez |
| 🔴 Kritik | React Error Boundary yok — herhangi bir render hatası = beyaz ekran |
| 🔴 Yayın engeli | `Info.plist`'te geçici ATS istisnası (`NSAllowsArbitraryLoads`) duruyor — App Store reddi sebebi |
| 🟠 Önemli | Analitik yok (Firebase Analytics bilinçli kapalı) — retention/funnel ölçülemiyor |
| 🟠 Önemli | Zorunlu güncelleme / sürüm kontrolü yok — eski istemciler süresiz çalışabilir |
| 🟠 Önemli | Mağaza dili "İngilizce" görünüyor (`CFBundleDevelopmentRegion: en`) |
| 🟡 Orta | Token'lar şifresiz depoda (Capacitor Preferences ≠ Keychain) |
| 🟡 Orta | Eklenti/core sürüm hizasızlığı (`--legacy-peer-deps` ile zorlanmış) |

Güçlü yönler: RevenueCat abonelik altyapısı (5 katman + webhook), sertleştirilmiş FCM push (presence-aware, token temizliği), Universal/App Links, NetGSM OTP, Cloudinary upload, rate limiting, çevrimdışı dayanıklılık, safe-area/klavye yönetimi, 70+ lazy-load chunk ile kod bölme. **Genel değerlendirme: sağlam temel, eksik olan gözlem/izleme katmanı.**

---

## 2. Boyut Analizi — 29 MB Neden Normal?

### 2.1 Framework karşılaştırması (taban boyutlar)

| Yaklaşım | iOS taban | Android taban | Not |
|---|---|---|---|
| **Capacitor (webview)** | ~10 MB | ~8-10 MB | Web bundle + ince native köprü |
| React Native | ~12-18 MB | ~10-15 MB | Hermes bytecode + native modüller |
| Flutter | ~15-20 MB | ~12-18 MB | Skia render motoru + Dart runtime |
| Tam native (Swift/Kotlin) | değişken | değişken | Genelde webview'den büyük çıkar |

Dimli'nin gerçekleşen dağılımı: ~10 MB web bundle (dist/) + Capacitor köprüsü ve eklentiler (~2-3 MB) + Firebase Messaging (~2-3 MB) + RevenueCat SDK (~1-2 MB) + native varlıklar → **~29 MB tam beklenen aralıkta** (üretim Capacitor uygulamaları için tipik aralık 18-30 MB).

### 2.2 iOS neden Android'den büyük?

Bu fark da normaldir ve eksiklik göstermez:

1. **App Thinning vs AAB:** Google Play, AAB'yi cihaza özel APK'lara böler (%30-50 küçülme). iOS'ta da App Thinning var ama Swift runtime, framework kopyaları ve Mach-O binary yapısı daha büyük kalır.
2. **Şifreleme şişmesi:** Apple, binary'yi DRM ile şifreler; sıkıştırma verimi düşer, mağazada görünen boyut büyür.
3. **CocoaPods framework'leri:** `use_frameworks!` ile her pod (Firebase, RevenueCat, ~20 pod) ayrı framework olarak paketlenir.

### 2.3 Web bundle dökümü (client/dist ≈ 10 MB)

| Kalem | Boyut | Not |
|---|---|---|
| `react-vendor` chunk | 224 KB | React + Router (bölünemez, doğru) |
| `LottiePlayerInner` chunk | 312 KB | Lazy-load ✓ |
| `Chat` sayfa chunk'ı | 140 KB | Lazy-load ✓ |
| `firebase` chunk | 78 KB | Sadece messaging web-impl peer'ı (native'de kullanılmaz) |
| CSS (`index-*.css`) | 528 KB | Tailwind — purge çalışıyor ama büyükçe |
| `icon.png` | **1,3 MB** | ⚠️ optimize edilebilir |
| `dimli.png` + `dimliLogin.png` | 768 + 652 KB | ⚠️ WebP'ye çevrilebilir (~%70 kazanç) |
| Lottie JSON'ları | ~280 KB | Makul |
| SVG'ler (~80 adet) | ~2 MB | En büyüğü 180 KB — gözden geçirilebilir |

**Sonuç:** Bir eksik aramak yerine, istenirse ~2 MB *küçültme* fırsatı var (PNG→WebP). Kaynak haritaları üretime sızmıyor ✓, chunk stratejisi mobil parse süresine göre doğru kurgulanmış ✓.

---

## 3. Mevcut Paket Envanteri

### 3.1 Capacitor core + resmî eklentiler (hepsi kullanımda)

| Paket | Sürüm | Kullanım yeri | Gerekli mi? |
|---|---|---|---|
| `@capacitor/core` | 6.2.1 | Platform algılama, köprü | ✅ Zorunlu |
| `@capacitor/app` | 6.0.3 | Deep link, geri tuşu, yaşam döngüsü (`App.tsx`) | ✅ Zorunlu |
| `@capacitor/splash-screen` | 6.0.4 | Açılış ekranı (`App.tsx`) | ✅ Zorunlu |
| `@capacitor/status-bar` | 6.0.3 | Durum çubuğu stili (`App.tsx`) | ✅ Zorunlu |
| `@capacitor/keyboard` | 6.0.4 | Klavye yüksekliği/scroll (`useKeyboardHeight/Scroll`) | ✅ Zorunlu |
| `@capacitor/preferences` | 8.0.1 | Oturum saklama (`authStorage.ts`) | ✅ Zorunlu (⚠️ sürüm + şifreleme notu: §5.7-5.8) |
| `@capacitor/network` | 6.0.4 | Çevrimdışı algılama (`NetworkContext`) | ✅ Zorunlu |
| `@capacitor/geolocation` | 6.1.1 | Konum (`LocationContext` + 3 ekran) | ✅ Zorunlu (ürün gereği) |
| `@capacitor/local-notifications` | 6.1.3 | Yerel bildirim (`pushNotificationService`) | ✅ Gerekli |
| `@capacitor/browser` | 8.0.3 | In-app tarayıcı (`AddPlayerModal`) | ✔ Kullanımda (⚠️ sürüm notu) |
| `@capacitor/push-notifications` | 6.0.5 | **Import edilmiyor** — FCM, firebase eklentisiyle | ⚠️ Muhtemelen kaldırılabilir* |
| `capacitor-native-settings` | 6.0.6 | Ayarlar uygulamasını açma | ✔ Kullanımda |

\* `capacitor.config.ts` içindeki `PushNotifications.presentationOptions` bloğu bu eklentiye aittir; kaldırmadan önce foreground bildirim davranışı cihazda test edilmeli.

### 3.2 Firebase + RevenueCat

| Paket | Sürüm | Rol | Gerekli mi? |
|---|---|---|---|
| `@capacitor-firebase/messaging` | 8.2.0 | FCM push (iOS+Android) | ✅ Zorunlu |
| `firebase` (web SDK) | 10.14.1 | Sadece messaging eklentisinin web-impl peer bağımlılığı; kodda hiç import edilmiyor | ✔ Peer olarak kalmalı |
| `@revenuecat/purchases-capacitor` | 9.2.2 | Abonelik/IAP — doğru tercih (Cordova IAP eklentileri terk edildi) | ✅ Zorunlu |

### 3.3 UI / ağ / yardımcı

`react` 19.2, `react-dom`, `react-router-dom` 7.9, `axios`, `socket.io-client` (gerçek-zamanlı sohbet), `lucide-react` (tree-shaken ikonlar), `lottie-react` (lazy), `@fontsource/inter` + `@fontsource/outfit` (fontlar bundle'da — ağ isteği yok ✓), `flag-icons`, `@vis.gl/react-google-maps`. Hepsi kullanımda, şişkinlik yok.

---

## 4. Standart Karşılaştırma — Profesyonel Bir Mobil Uygulamada Olması Gerekenler

| Yetenek | Endüstri standardı paket | Dimli durumu |
|---|---|---|
| Push bildirim | `@capacitor-firebase/messaging` | ✅ Var — presence-aware, token temizliği, tıklama yönlendirmesi |
| Uygulama içi satın alma | `@revenuecat/purchases-capacitor` | ✅ Var — 5 abonelik katmanı + sunucu webhook |
| Deep link / Universal Link | `@capacitor/app` + AASA/assetlinks | ✅ Var — `/invite/*`, bekleyen davet akışıyla |
| Splash / StatusBar / Keyboard | Resmî eklentiler | ✅ Var |
| Çevrimdışı algılama | `@capacitor/network` | ✅ Var — banner + oturum koruma |
| Konum | `@capacitor/geolocation` | ✅ Var — sunucu tarafı ilçe türetme ile |
| **Çökme raporlama** | `@sentry/capacitor` veya Crashlytics | ❌ **YOK** |
| **Hata sınırı (Error Boundary)** | React ErrorBoundary + fallback UI | ❌ **YOK** |
| **Analitik** | `@capacitor-firebase/analytics` | ❌ YOK (bilinçli kapalı) |
| **Sürüm kontrolü / zorunlu güncelleme** | `@capawesome/capacitor-app-update` + sunucu endpoint | ❌ YOK |
| Native mağaza puanı istemi | `@capacitor-community/in-app-review` | ⚠️ Kısmi — RatingModal yalnızca iç puanlama, mağazaya yansımıyor |
| Güvenli token saklama | Keychain/Keystore tabanlı eklenti | ⚠️ Kısmi — Preferences şifresiz (UserDefaults/SharedPreferences) |
| Haptik geri bildirim | `@capacitor/haptics` | ⚠️ Kısmi — `navigator.vibrate` (iOS'ta çalışmaz) |
| Native paylaşım | `@capacitor/share` | ❌ YOK — davet linki paylaşımı için değerli |
| OTA / canlı güncelleme | `@capgo/capacitor-updater` | ❌ YOK (opsiyonel; Appflow kapanıyor, alternatif Capgo) |
| Privacy manifest (iOS 17+) | App-level `PrivacyInfo.xcprivacy` | ⚠️ Kısmi — pod'lar kendi manifestlerini getiriyor, uygulama seviyesinde yok |
| Health check (sunucu) | `/health` endpoint | ❌ YOK |
| i18n çerçevesi | i18next vb. | ➖ Gerekmiyor (bilinçli Türkçe-only; hedef kitle TR) |

---

## 5. Kritik Bulgular ve Düzeltme Önerileri

### 5.1 🔴 ATS istisnası — App Store yayın engeli
**Dosya:** [Info.plist:38-43](client/ios/App/App/Info.plist#L38-L43)
`NSAllowsArbitraryLoads: true` — yereldeki `http://192.168.2.17:3000` testi için eklenmiş (commit edilmemiş, dosyadaki yorum da "test bitince sil" diyor). Bu blokla mağazaya gönderilen build reddedilir veya ek gerekçe istenir.
**Aksiyon:** TestFlight/App Store build'i almadan önce bloğu tamamen sil. Yerel test gerektiğinde `NSExceptionDomains` ile yalnızca test IP'sine istisna tanımlamak daha güvenli bir alternatif. **Efor: 5 dk.**

### 5.2 🔴 Çökme raporlama yok
Üretimde JS hatası, native crash, ANR — hiçbiri görünmüyor. Kullanıcı "uygulama kapandı" dediğinde elde veri yok.
**Öneri:** `@sentry/capacitor` (+ `@sentry/react`). Webview mimarisinde Sentry, Crashlytics'e göre üstün: JS hata yığınları source map ile çözülür, breadcrumb'lar, release takibi. Sunucu tarafına da `@sentry/nestjs` eklenerek uçtan uca izleme kurulabilir. Ücretsiz katman (5K hata/ay) başlangıç için yeterli.
**Efor: ~2-3 saat** (client init + source map upload + NestJS entegrasyonu).

### 5.3 🔴 React Error Boundary yok
Herhangi bir render hatası tüm uygulamayı beyaz ekrana düşürür; kullanıcının tek çıkışı uygulamayı öldürmek.
**Öneri:** `App.tsx`'te route seviyesinde ErrorBoundary + Türkçe fallback UI ("Bir şeyler ters gitti — Yeniden Dene" butonu) + hatayı Sentry'ye raporlama. Sentry'nin hazır `ErrorBoundary` bileşeni ikisini tek adımda çözer.
**Efor: ~1 saat.**

### 5.4 🟠 Analitik yok
`IS_ANALYTICS_ENABLED: false` (her iki platform config'inde). Retention, funnel (kayıt sihirbazı nerede terk ediliyor?), özellik kullanımı (JokerPool vs Marketplace) ölçülemiyor.
**Öneri:** `@capacitor-firebase/analytics` — Firebase projesi (dimli-41c49) zaten mevcut, config dosyalarında flag açılıp eklenti eklenerek devreye girer. Ekran görüntüleme + 8-10 kritik olay (kayıt tamamlandı, rezervasyon yapıldı, maç ilanı açıldı, abonelik başladı) ile başlanmalı.
**Not:** Analitik eklenince App Store gizlilik etiketleri ve Play Data Safety formu güncellenmeli; yalnızca first-party analitik + IDFA kullanmadıkça ATT izni gerekmez.
**Efor: ~2-3 saat.**

### 5.5 🟠 Sürüm kontrolü / zorunlu güncelleme yok
Kritik bir güvenlik yaması veya kırıcı API değişikliği yayınlandığında eski istemcileri güncellemeye zorlamanın yolu yok.
**Öneri:** Sunucuya `GET /app-version` → `{ minVersion, latestVersion, storeUrls }`; istemcide açılışta karşılaştırma + `minVersion` altındaysa kapatılamayan "Güncelleme Gerekli" modalı. `@capawesome/capacitor-app-update` Android'de in-app update akışını, iOS'ta App Store yönlendirmesini sağlar.
**Efor: ~3-4 saat** (endpoint + istemci modalı + eklenti).

### 5.6 🟠 Mağaza dili "İngilizce" görünüyor
**Dosya:** [Info.plist:5-6](client/ios/App/App/Info.plist#L5-L6) — `CFBundleDevelopmentRegion: en`.
Ekran görüntünüzdeki "Diller: İngilizce" bunun sonucu; uygulama Türkçe olduğu halde mağaza vitrini yanlış bilgi veriyor.
**Aksiyon (üç adım):**
1. `CFBundleDevelopmentRegion` → `tr` + `CFBundleLocalizations` dizisi ekle (`tr`).
2. Xcode'da projeye Türkçe lokalizasyon ekle (`tr.lproj` klasörü oluşsun — App Store dilleri `.lproj` klasörlerinden okur).
3. App Store Connect'te birincil dilin Türkçe olduğunu doğrula.
**Efor: ~30 dk + yeni build.**

### 5.7 🟡 Token'lar şifresiz depoda
**Dosya:** [authStorage.ts](client/services/authStorage.ts)
`@capacitor/preferences`, iOS'ta `UserDefaults`, Android'de `SharedPreferences` kullanır — **ikisi de şifresiz düz dosyadır** (localStorage'dan iyidir ama Keychain değildir). JWT burada saklanıyor.
**Öneri:** `capacitor-secure-storage-plugin` veya `@aparajita/capacitor-secure-storage` (iOS Keychain + Android Keystore). `authStorage.ts` zaten tek kapı olduğundan geçiş yalnızca bu dosyayı değiştirir; mevcut `migrateFromLocalStorage()` desenine benzer tek seferlik Preferences→Keychain taşıma eklenir.
**Efor: ~2 saat.**

### 5.8 🟡 Eklenti/core sürüm hizasızlığı
`@capacitor/core` 6.2.1 iken `@capacitor/preferences@8`, `@capacitor/browser@8`, `@capacitor-firebase/messaging@8` kurulu ve `--legacy-peer-deps` ile zorlanıyor (CLAUDE.md'de de kayıtlı). Bugün çalışıyor ama major sürümler farklı Capacitor köprü API'lerini hedefler; sessiz uyumsuzluk riski taşır ve her `npm install`'ı kırılgan yapar.
**Öneri:** Orta vadede toplu **Capacitor 7 (veya 8) yükseltmesi** planla; tüm resmî eklentileri core ile aynı major'a hizala, `--legacy-peer-deps` ihtiyacını ortadan kaldır. (Capacitor 7, Xcode 16 / iOS 18 SDK gereksinimiyle de uyumlu yol.)
**Efor: ~1 gün (test dahil).**

### 5.9 🟡 Diğer yayın hijyeni maddeleri
- **Android minify kapalı** ([build.gradle](client/android/app/build.gradle) `minifyEnabled: false`): R8 açılırsa APK küçülür ve kod karmaşıklaştırılır; Capacitor/Firebase için proguard kuralları eklenerek denenebilir. Efor: ~2 saat + regresyon testi.
- **App-level `PrivacyInfo.xcprivacy` yok:** Pod'lar (Firebase, RevenueCat) kendi manifestlerini getiriyor; ancak uygulamanın kendisinin eriştiği API'ler (ör. UserDefaults/Preferences) için app-level manifest önerilir. Efor: ~1 saat.
- **Sunucu health check yok:** `GET /health` (DB ping + sürüm) — Render restart'larının teşhisi ve ileride izleme için. Efor: ~30 dk.
- **`UIRequiredDeviceCapabilities: armv7`** eski bir kalıntı; `arm64` olmalı (mevcut cihazlarda pratik etkisi yok, kozmetik). 
- **`synchronize: true`** (TypeORM): kullanıcı sayısı büyüdüğünde migration düzenine geçiş planlanmalı (mevcut bilinçli tercih, hatırlatma olarak not edildi).

---

## 6. Önerilen Paket Listesi (öncelik sıralı)

### Kritik (yayın öncesi şiddetle önerilir)
| Paket | Gerekçe |
|---|---|
| `@sentry/capacitor` + `@sentry/react` | Çökme/hata görünürlüğü — üretimdeki tek kör nokta |
| *(paket değil)* ErrorBoundary | Beyaz ekran yerine kurtarılabilir hata UI'ı |

### Önerilen (ilk büyük güncellemede)
| Paket | Gerekçe |
|---|---|
| `@capacitor-firebase/analytics` | Retention/funnel ölçümü; Firebase projesi hazır |
| `@capawesome/capacitor-app-update` | Zorunlu güncelleme akışı (+ sunucuda `/app-version`) |
| `@capacitor-community/in-app-review` | Maç sonrası doğru anda native mağaza puanı istemi — mağaza puanını doğrudan yükseltir |
| `capacitor-secure-storage-plugin` | JWT'yi Keychain/Keystore'a taşıma |
| `@capacitor/share` | Takım davet linkini native paylaşım menüsüyle gönderme (viral büyüme) |
| `@capacitor/haptics` | iOS'ta da çalışan dokunsal geri bildirim (uzun basma, başarı anları) |

### Opsiyonel (ihtiyaç doğunca)
| Paket | Gerekçe |
|---|---|
| `@capgo/capacitor-updater` | OTA/canlı JS güncellemesi — mağaza onayı beklemeden hotfix. (Ionic Appflow kapanıyor; Capgo güncel standart) |
| `@capacitor/camera` | Şu an HTML file input yeterli; native kamera UX'i istenirse |
| i18next | Yalnızca Türkçe dışına açılma kararı alınırsa |

**Bilinçli olarak önerilmeyenler:** Ads SDK'ları, üçüncü parti login (eklenirse Apple ile Giriş zorunluluğu doğar), ağır state-management kütüphaneleri (mevcut Context yapısı yeterli).

---

## 7. Mağaza Uyumluluk Kontrol Listesi (2025-2026)

### App Store (iOS)
- [ ] **ATS bloğunu sil** (§5.1) — yayın engeli
- [ ] **Dil düzeltmesi** (§5.6) — `tr` bölge + `tr.lproj` + Connect birincil dil
- [ ] **Hesap silme**: uygulama içinden hesap silinebilmeli (Guideline 5.1.1(v)) — mevcut durumu doğrulayın; yoksa profil ayarlarına eklenmeli
- [ ] **Xcode 16 / iOS 18 SDK** ile build (Nisan 2025'ten beri zorunlu) — Capacitor 7 yükseltmesiyle doğal çözülür
- [ ] App-level **PrivacyInfo.xcprivacy** (§5.9)
- [ ] Analitik eklenirse **gizlilik etiketleri** güncelle
- [x] `ITSAppUsesNonExemptEncryption: false` ✓ mevcut
- [x] İzin açıklamaları Türkçe ve amaca uygun ✓ (konum/kamera/foto)

### Google Play (Android)
- [x] **Target API 35** ✓ (2025 sonu gereksinimi karşılanıyor)
- [ ] **Hesap silme URL'si**: giriş gerektirmeyen, herkese açık bir silme sayfası zorunlu — `web/` projesine (dimli.com.tr) eklenebilir
- [ ] **Data Safety formu** analitik/Sentry eklenince güncellenecek
- [ ] R8/minify değerlendirmesi (§5.9)

---

## 8. Yol Haritası

**Faz 1 — Bir sonraki yayından önce (~1 gün):**
ATS bloğunu sil → Sentry + ErrorBoundary → mağaza dili düzeltmesi → app-level privacy manifest → hesap silme akışını doğrula/ekle.

**Faz 2 — İlk büyük güncelleme (~2-3 gün):**
Firebase Analytics + olay şeması → `/app-version` + zorunlu güncelleme → in-app review istemi → `@capacitor/share` ile davet paylaşımı → secure storage geçişi → `/health` endpoint.

**Faz 3 — Orta vade:**
Capacitor 7/8 toplu yükseltme (sürüm hizasızlığını bitirir) → Android R8 → PNG→WebP varlık optimizasyonu (~2 MB kazanç) → Capgo OTA değerlendirmesi → TypeORM migration düzeni.

---

*Bu rapor; `client/package.json`, `capacitor.config.ts`, iOS/Android native proje dosyaları, `client/dist` çıktısı, sunucu modülleri ve 2025-2026 Apple/Google yayın gereksinimlerinin (developer.apple.com, support.google.com/googleplay, capacitorjs.com) taranmasıyla hazırlanmıştır.*
