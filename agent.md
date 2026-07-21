# agent.md — Dimli Bilgi Tabanı (admin panel odaklı)

> Bu dosya, Dimli projesinde çalışacak bir AI ajanın hızlıca devralması için hazırlanmış
> bilgi notudur. Özellikle **admin panel (`client-admin/`)** ve onu besleyen **backend**
> üzerine derinleştirilmiştir. Kalıcı kurallar için ayrıca repo kökündeki **`CLAUDE.md`**'yi oku
> (oradaki talimatlar bağlayıcıdır). Bu dosya ise "neyin nerede olduğu + bilinen sorunlar"
> haritasıdır. Son güncelleme: 2026-07-04.

---

## 1. Uygulama nedir? (ürün bağlamı)

Dimli, **halı saha** rezervasyon/maç organizasyonu için bir **mobil uygulamadır**.

- **Yalnızca mobil (iOS/Android).** Hiçbir zaman web'de yayınlanmayacak; web uyumu/responsive
  gerekmiyor. `client/` Capacitor uygulamasıdır; tasarımlar **native mobil** standartlarına göre
  yapılır (safe-area, edge-to-edge, dokunmatik hedefler).
- **Tasarım yaklaşımı:** Tüm iOS/Android ekran boyutlarında **aynı görüntü** hedeflenir; ekran
  küçüldükçe font ve ölçek küçültülür ki sıkışma/daralma/alt-satıra-düşme olmasın.
- **İş modeli:** İşletmeler **uygulama-içi satın alma ile abonelik** (RevenueCat) öder; kullanıcılar
  **ücretsiz** kullanır. Abonelik plan tipleri saha sayısına göre (`1_pitch` … `5plus_pitch`).
- **`web/` klasörü:** Uygulamanın **tanıtım/destek web sitesi** (Next.js). Üründen ayrıdır.
- **`client-admin/` (bu dosyanın odağı):** İşletmelerin **onay süreçleri**, askıya alma,
  **değişiklik istekleri**, **saha onayları**, kullanıcıların **chat yasakları**, **şikayetler** gibi
  şeyleri yönettiğimiz **web yönetim arayüzü** (sadece yöneticiler kullanır).

---

## 2. Repo yapısı (3 bağımsız alt proje)

| Dizin | Ne | Stack | Port |
|---|---|---|---|
| `client/` | Mobil uygulama (asıl ürün) | React 19 + Capacitor 6 | Vite dev |
| `client-admin/` | Admin yönetim paneli | React 18 + Vite + Tailwind | 5174 |
| `server/` | Backend API | NestJS 11 + TypeORM + PostgreSQL | 3000 |
| `web/` | Tanıtım sitesi | Next.js 14 + Tailwind 3 | — |

### Çalıştırma komutları
```bash
# Server
cd server && npm run start:dev      # watch
cd server && npm run build / lint / test / test:e2e

# Client (mobil)
cd client && npm run dev
cd client && npm run build && npx cap sync
npx cap build ios | android

# Admin panel
cd client-admin && npm run dev      # :5174
cd client-admin && npm run build
```

---

## 3. Auth — iki ayrı JWT

- **User JWT** (`JwtAuthGuard`, secret=`JWT_SECRET`): müşteri/uygulama route'ları.
- **Admin JWT** (`AdminJwtAuthGuard`, secret=`ADMIN_JWT_SECRET`, 8s): tüm `/admin/` route'ları.
  Token payload'ında `adminRole` taşır (`superadmin | admin | reviewer`).
- Admin panelde token `localStorage['admin_token']`; `adminApi` axios interceptor `Bearer` ekler,
  401'de token'ı silip `/login`'e atar (`client-admin/src/services/adminApi.ts`).
- Admin oluşturma: `server/scripts/create-admin.ts` (varsayılan `admin@dimli.com`).
  Canlıda mevcut: 1 superadmin (`admin@dimli.com`).

> ⚠️ **Önemli:** Backend'de **rol bazlı yetki kontrolü YOK** — guard sadece "geçerli admin token mı"
> bakıyor, rolü kontrol etmiyor. Bkz. §8/C1.

---

## 4. Admin panel haritası (`client-admin/`)

**Desen:** Her sayfa = `Xxx.tsx` (saf UI) + `hooks/useXxx.ts` (tüm API+state). Route'lar `App.tsx`,
menü `components/Sidebar.tsx`, ikonlar `components/Icons.tsx`, tema koyu (`bg-[#0f1827]`/`#1e2d47`).

**Sayfalar (10) ve besleyen endpoint'ler:**

| Sayfa | Endpoint(ler) | Not |
|---|---|---|
| Dashboard | `GET /admin/statistics`, `GET /admin/deletion-report` | Sayımlar, gelir, aylık büyüme, silme raporu, grafikler |
| Bekleyen/Onaylı/Reddedilen/Askıda | `GET /admin/applications?status=` | 4 sayfa, ortak `ApplicationsList` |
| Başvuru detay | `GET/PATCH /admin/applications/:id`, `.../approve`, `.../reject`, `/businesses/:id/suspend|activate` | Düzenleme + onay/red/askı |
| Değişiklik İstekleri | `GET /admin/change-requests?status=`, `.../approve|reject` | CUSTOM_FACILITY / PHOTO_UPDATE |
| Saha Onayları | `GET /admin/pitch-approvals?status=`, `.../approve|reject` | Yeni saha onayı |
| Şikayetler | `GET /admin/reports?status=`, `PATCH .../status`, `POST/DELETE /admin/users/:id/chat-ban` | Sidebar badge: `GET /admin/reports/pending-count` |
| Chat Yasakları | `GET /admin/users/banned`, `DELETE /admin/users/:id/chat-ban` | |
| Silinen İşletmeler | `GET /admin/businesses/deleted` | Salt-okunur; ⚠️ sahip bilgisi boş gelir (§7) |

**Backend tarafı:** `server/src/admin/admin.controller.ts` (endpoint'ler) →
`admin.service.ts` (mantık). Korumalı endpoint'lerin **hepsi** `@UseGuards(AdminJwtAuthGuard)`
(2026-07-01: seed endpoint de guard'landı → artık istisna yok, §8/C3 ✅ / §20).

---

## 5. Veri modeli özeti (server, TypeORM, PostgreSQL)

- **25 entity**, `synchronize: true` (migration YOK — `app.module.ts`), `autoLoadEntities: true`.
  Yeni kolon = server restart'ta otomatik oluşur.
- **Status enum'ları:**
  - `businesses.status`: `pending | active | rejected | suspended` (+ soft-delete `deletedAt`)
  - `pitches.approvalStatus`: `pending | approved | rejected` (+ `deletedAt`)
  - `subscriptions.status`: `trial | active | expired | cancelled`
  - `reservation.status`: `PENDING | APPROVED | REJECTED | CANCELLED | EXPIRED`
  - `user_reports.status`: `pending | reviewed | dismissed`
  - `pitch_change_requests.status`: `pending | approved | rejected`
- **Soft-delete kolonu olanlar:** `businesses`, `pitches`, `chat_participants_v2` (`deletedAt`).
- **Önemli ilişki/cascade:** `pitches→time_slots` (CASCADE), `pitches→recurring_closures` (CASCADE),
  `chat_channels→messages/participants` (CASCADE), `user→user_blocks/user_reports/team_bans` (CASCADE),
  `match_announcements→challenges` (CASCADE), `reservation→match_announcement/recurring_closure` (SET NULL).
- **Abonelik:** `subscriptions.ownerId → business_owner` (işletme değil, sahip bazlı). RevenueCat
  alanları (`revenuecatCustomerId/EntitlementId`). Aktif abonelik = `status='active'` ve süresi geçmemiş.
- **Chat:** Gateway `server/src/gateway/app.gateway.ts`; 4 kanal: `DM | MATCH_GROUP | TEAM_INTERNAL |
  JOKER_NEGOTIATION`. Chat ban `ChatService.sendMessage()` içinde uygulanır (`isChatBanned` + expiry).

> ⚠️ **Şema tutarsızlığı:** Bazı ID kolonları `uuid` (gerçek FK), bazıları FK'sız `varchar`
> (`notifications.userId`, `ratings.target*`, `pitch_change_requests.business_id`,
> `team.home_*_id`, `reservation.proposedByUserId/cancelRequestedByTeamId`). Adlandırma da karışık
> (camelCase + snake_case). Bkz. §8/D.

---

## 6. İşletme silme akışı (kritik — adım adım)

İşletme silme **yalnızca işletme sahibinin kendi hesabını silmesiyle** olur
(`business-owner.service.ts` → `deleteAccount`). Admin panelinde işletme **silme yok** (sadece
suspend/activate + salt-okunur "Silinen İşletmeler"). Akış, **tek transaction** içinde:

1. Şifre doğrula; ileri tarihli **APPROVED** rezervasyon varsa **silmeyi engelle**.
2. `subscriptions` (owner'a ait) → **hard delete**.
3. Bekleyen `pitch_change_requests` (saha'lara ait) → **hard delete**.
4. `pitches` → **soft-delete** (`deletedAt`, `isActive=false`); takım `home_pitch_id` referansı null'la.
5. `businesses` → **soft-delete** (`deletedAt`); takım `home_business_id` ve kullanıcı
   `favoriteBusinessIds` referansları temizlenir.
6. `business_owner` → **hard delete** (⚠️ sahip kaybı, §7).
7. commit / hata olursa rollback.

**Soft kalan (geçmiş için):** Business, Pitch satırları, Reservation, Rating, MatchAnnouncement,
ChatChannel/Message — bozulmaz.

---

## 7. Veri doğruluğu / bilinen gösterim sorunları (canlı DB ile, 2026-06-28)

Mevcut ölçek küçük: ~14 kullanıcı, 5 işletme (3 aktif + 2 silinmiş), 3 abonelik (hepsi trial),
7 saha, 88 rezervasyon, 4 şikayet (hepsi reviewed). Durum sayıları panele **doğru** yansıyor. İki hata:

1. **Dashboard MRR yanıltıcı:** `admin.service.ts:633` MRR'a **trial'ları dahil ediyor**. Canlıda 0
   ödeyen müşteri varken dashboard ~6.420 ₺ "gelir" gösteriyor. "Potansiyel" vs "gerçekleşen" ayrılmalı.
2. **Silinen işletmelerde sahip boş:** Silmede `business_owner` hard-delete edildiği için "Silinen
   İşletmeler" sayfası owner adı/email gösteremiyor (canlıda 2/2 boş).

---

## 8. Bilinen sorunlar / teknik borç (öncelikli)

> Detaylı rapor: kullanıcı onaylı plan dosyası (`~/.claude/plans/quiet-questing-squid.md`).
> Öncelik sırası: (1) Ölçeklenebilirlik, (2) Güvenlik & denetim, (3) Veri bütünlüğü.

**B — Ölçeklenebilirlik → ✅ TASK 1 TAMAMLANDI (2026-06-28):**
- B1. ✅ Tüm liste endpoint'lerine **sayfalama** eklendi. Ortak `PaginationQueryDto`
  (`server/src/common/dto/pagination-query.dto.ts`, page/limit≤100/search) + `Paginated<T>` zarfı
  (`{items,total,page,limit,totalPages}`). Frontend: `client-admin/src/hooks/usePaginatedList.ts`
  (stale-response reqId guard + sayfa-reset + son-sayfa clamp) + `components/Pagination.tsx`.
- B2. ✅ **N+1 giderildi:** owner artık `leftJoinAndSelect('b.owner','owner')` ile tek JOIN
  (`admin.service.ts → listBusinesses` çekirdeği; 3 metot birleşti). Liste sorgusunda timeSlots düşürüldü.
- B3. ✅ **`getStatistics`** → tek `GROUP BY status,planType` + 2× `GROUP BY date_trunc('month')`
  (24 COUNT yerine); 60sn in-memory TTL cache (`cached()`), durum mutasyonlarında bust. Şekil korundu.
- B4. ✅ **`getDeletionReport`** → `GROUP BY reason` + `GROUP BY month`; aynı cache. Şekil korundu.
- B5. ✅ **Sunucu-taraflı ILIKE arama** (`applySearch` + Brackets) + `components/SearchInput.tsx` (debounce).
- B6. ⏳ **`updateApplication`** iç içe döngü sorgusu — DOKUNULMADI (tek-işletme düzenleme, ölçek
  darboğazı değil; düşük öncelik, ileride bakılabilir).
- Doğrulama: server build/lint + canlı DB'ye salt-okunur SQL doğrulaması (count şişmesi yok,
  `created_at` eşlemesi doğru); client-admin `tsc --noEmit` + build; 4-boyutlu adversaryal review (2
  düşük-önem UX bulgusu, biri düzeltildi). **Şekil değişimi kırıcı → FE+BE birlikte deploy edilmeli.**

**C — Güvenlik & denetim:**
- C1. **RBAC YOK** — reviewer de suspend/ban/approve yapabiliyor. → `@Roles`+`RolesGuard`.
- C2. **Audit log YOK** — `approveApplication`/`rejectApplication` adminId alıp `_adminId` olarak
  atıyor. → `admin_audit_log` tablosu + adminId'yi yaz.
- C3. ✅ **ÇÖZÜLDÜ (2026-07-01, §20):** `/admin/maintenance/seed-subscriptions` artık
  `@UseGuards(AdminJwtAuthGuard)`'lı; kodda gömülü `'dimli-seed-2026'` fallback secret'ı ve
  `secret` parametresi tamamen kaldırıldı (admin JWT asıl koruma).
- C4. JWT localStorage'da; yetki kararı her zaman sunucuda doğrulanmalı.

**D — Veri bütünlüğü → ✅ TASK 2 ELE ALINDI (2026-06-28, rafine ölçümle):**
- D1. **DÜZELTME:** İlk rapordaki "70 bildirim / 44 maç ilanı / 7 rating" öksüz sayıları YANLIŞTI.
  Canlı veride rafine ölçüm: gerçek öksüz = **yalnızca 30 bildirim** (1 silinmiş işletme sahibinden;
  171 user'a + 40 geçerli **işletme sahibine** ait olanlar öksüz değil). "44 maç ilanı / 7 rating /
  29 rezervasyon" = soft-delete edilmiş saha/işletmeye ait **TARİHSEL** kayıtlar (satırlar duruyor),
  "kapandı/değerlendirme" akışının ihtiyacı (`ratings.service.ts:63-162` `business.deletedAt` →
  `businessDeleted` flag → client "Kapandı"). **Öksüz DEĞİL, silinmemeli.**
- D1-fix. Kök neden: `business-owner.service.ts deleteAccount` sahibin bildirimlerini temizlemiyordu →
  düzeltildi (transaction'a `delete(Notification,{userId:owner.id})` eklendi). Mevcut 30 öksüz için
  tek seferlik `scripts/cleanup-orphan-notifications.ts` (idempotent, `DATABASE_URL` ile çalışır).
- D2. **FK overhaul YAPILMADI (bilinçli):** `notifications.userId` polimorfik (User VEYA BusinessOwner →
  tek FK imkânsız); rating/maç/rezervasyon target'larına `ON DELETE CASCADE` soft-delete tarihsel
  kayıtlarını silip "kapandı" akışını bozar; `synchronize:true` ile şema/FK değişimi riskli. Bu yüzden
  veri bütünlüğü **uygulama seviyesinde** (silme akışında temizlik) çözülüyor, DB-seviyesi FK ile değil.
- D3. `synchronize: true` production'da — migration altyapısı hâlâ gelecek işi (ama D2 nedeniyle FK
  refactor'u öncelik değil).
- D4. `users.service.ts deleteAccount` transaction'sız (kısmi-state riski) — bu turda dokunulmadı
  (kullanıcı "silme akışına dokunma" dedi); gelecekte sağlamlaştırılabilir.

**E — İşletme silme → ✅ TASK 3 TAMAMLANDI (2026-06-28):**
- ✅ **Sahip arşivi:** Business'e `ownerNameSnapshot/ownerEmailSnapshot/ownerPhoneSnapshot` +
  `deletedBy/deletionReason/deletionNote` + `restoredAt/restoredBy` (nullable, synchronize). `business-owner
  deleteAccount` owner hard-delete'ten ÖNCE snapshot+nedeni Business'a yazar (geriye uyumlu, reason/note ops.).
  "Silinen İşletmeler" + detay sahibi snapshot'tan gösterir.
- ✅ **Admin restore:** `POST /admin/businesses/:id/restore` → business+pitches un-soft-delete (status korunur,
  restoredBy=admin). Detayda "Geri Yükle" + "Silinmiş" arşiv kartı. **Sadece veri restore** (auth/uniqueness'a
  dokunulmadı); owner self-delete ettiyse "sahip yeniden kayıt olmalı" notu.
- ✅ **Silme nedeni:** owner mobil `BusinessSubscriptionSettings/components/DeleteModal.tsx` iki-adımlı
  neden+not (paylaşımlı `client/utils/deletionReasons.ts`). ⚠️ Neden alanı **app store sürümü** çıkınca dolar
  (o ana kadar reason=null; server+admin hemen çalışır).
- **Not:** mevcut 2 eski silinmiş işletme backfill edilemez (sahibi gitti) → "arşivlenmemiş". Owner hard-delete
  bilinçli kaldı (email/phone uniqueness); FK/CASCADE/owner-soft-delete YAPILMADI.

**F — Panel içeriği (geliştirilebilir):**
- Kullanıcı yönetimi sayfası yok, genel işletme+abonelik listesi yok, rezervasyon/aktivite görünürlüğü
  yok, MRR ayrımı yok, audit görünümü yok, global arama yok.

---

## 9. DB erişimi notu (analiz/inceleme için)

- Analizde **canlı production DB**'ye (Render PostgreSQL) **salt-okunur** bağlanıldı (yalnız
  `SELECT`/`COUNT`). **Hiçbir yazma yapılmadı.**
- ⚠️ **Bağlantı dizesi/şifre bu dosyada TUTULMAZ** (repo'ya sızmasın). Gerektiğinde **kullanıcıdan iste.**
- Bağlanırken `?sslmode=require` gerekir. Sorgularda **asla** mutasyon (UPDATE/DELETE/INSERT) çalıştırma —
  bu canlı kullanıcı verisidir.
- Yararlı: tablo adları çoğunlukla camelCase kolon kullanır ama `match_announcements`, `team`,
  `admin_users`, `pitch_change_requests` snake_case kolonlar içerir (join'de dikkat).

---

## 10. Bu dosyayı güncelle

Yeni bir şey öğrenince (yeni sayfa/endpoint, çözülen teknik borç, şema değişikliği) bu dosyaya işle.
Çözülen maddeyi §8'den çıkar/işaretle. Kalıcı çalışma kuralları `CLAUDE.md`'ye, geçici/oturumluk
notlar buraya değil.

---

## 11. Joker (yedek oyuncu) sistemi — UYGULAMA tarafı (2026-06-28 denetimi)

> Bu, uygulama-tarafı (`client/` + `server/`) bilgi tabanının ilk bölümü. Admin paneli kapsam dışı.

### Ne işe yarar / akış
Bir kullanıcı joker modunu açıp **başka takımların** tek maçlık sohbetine misafir oyuncu olarak
katılabilir. Kaptan da joker olabilir.
1. `PATCH /users/me { isJoker:true }` → konum (lat/lng) ile joker havuzuna girer.
2. Kaptan `GET /users/jokers?lat&lng&radius[&position&sharesFee]` ile yakındaki jokerleri bulur
   (Haversine, `users.service.ts getJokers`).
3. Kaptan `POST /notifications/joker-invite {jokerId,matchId,note}` → `JOKER_INVITE` bildirimi.
4. Joker kabul → `POST /chat/joker-negotiation {matchId,inviterId,notificationId}` → joker+kaptan
   arası 1:1 `JOKER_NEGOTIATION` kanalı (`chat.service.ts createJokerNegotiation`).
5. Kaptan `POST /chat/channels/:id/invite-joker` → joker ana `MATCH_GROUP`'a eklenir
   (`JOKER_JOINED` sistem mesajı; `inviteJokerToMatchGroup`).
6. Çıkış/atılma: `DELETE /chat/channels/:id/jokers/:jokerId` (`removeJokerFromChannel`); ilgili
   `JOKER_NEGOTIATION` da soft-delete edilir. Listeleme: `GET /chat/channels/:id/jokers`.

Anahtar dosyalar: `server/src/chat/chat.service.ts` (joker metotları ~1271-1641, isJoker tespiti
~265-277), `server/src/notifications/notifications.service.ts` (~220-312),
`server/src/users/users.service.ts getJokers`, `client/components/Modals/{JokerProfileModal,
InviteJokerModal,ManageJokersModal,JokerDMChatInfoModal}.tsx`, `client/pages/customer/JokerPool/*`.

### KRİTİK mimari nüanslar (hatalara zemin)
- **`MatchAnnouncement` tek takıma aittir** (`team_id`), ama onaylı maçın `MATCH_GROUP` kanalında
  **iki takım** vardır. Kanalların `relatedMatchId`'si = **maç ilanı id'si** (reservation değil).
  ⚠️ `chat_channels.relatedMatchId` **varchar**, `match_announcements.id` **uuid** → ham SQL'de
  join için `ma.id::text = c."relatedMatchId"` cast'i gerekir.
- **Joker tespiti tamamen takım-bazlı:** bir `MATCH_GROUP` katılımcısının `teamId`'si maçtaki iki
  takımdan biri değilse joker sayılır. `user.isJoker` bayrağı sadece havuzda görünürlük içindir.
- ⚠️ `user` tablosunda kolon adı **`team_id`** (snake_case) ama **`isJoker`** camelCase (karışık).
  Entity property `teamId`/`isJoker` (kodda bunları kullan).

### Bilinen sorunlar (denetim F1–F7; adversaryal + canlı-DB ile doğrulandı)
**✅ Bu oturumda DÜZELTİLDİ (server, geriye-uyumlu, synchronize):**
- **F3 — yetim joker:** "Joker'i hangi takım davet etti" bilgisi sorgu anında canlı
  `sender.team`'den türetiliyordu → davet eden kaptan takımdan ayrılınca (canlıda 14 kullanıcının
  6'sı takımsız!) joker görünmez/çıkarılamaz hale geliyordu. Fix: `JOKER_JOINED` metadata'sına
  `invitingTeamId` yazılıyor; `getJokersInChannel`/`removeJokerFromChannel` önce onu, yoksa
  `sender.team` fallback'ini kullanıyor.
- **F4 — iptalde joker öksüzlüğü:** `cancel()`/`acceptCancelRequest()` sadece iki takımın
  oyuncularına bildirim atıyor, jokeri ne çıkarıyor ne haber veriyordu (canlıda ölü maç
  gruplarında 27 budanmamış aktif üyelik). Fix: `reservations.service.ts
  cleanupJokersOnMatchCancel()` helper'ı — jokeri `MATCH_GROUP`'tan soft-delete + `SYSTEM`
  bildirim (`JOKER_MATCH_CANCELLED`) + `JOKER_NEGOTIATION` temizliği.
- **F5 — çift rezervasyon:** `inviteJokerToMatchGroup` zaman çakışmasını/kadroyu kontrol etmiyordu
  (canlıda aynı kullanıcı 2026-06-20 22:00 için iki maç grubunda görüldü). Fix: joker'in başka
  aktif `MATCH_GROUP` üyeliklerinde **aynı date+time** varsa reddet + takım başına joker sayısı
  `playerCount`'u aşamaz (suistimal kapısı).

**✅ 2026-07-01'de EK OLARAK DÜZELTİLDİ (server, geriye-uyumlu, §20):**
- **F1 — davet yetkisi:** `sendJokerInvite` artık çağıranın `match.team`'in kaptanı/yardımcı
  kaptanı olduğunu doğruluyor (aksi halde `ForbiddenException`). Davet her zaman `match.team`
  adına gittiği için kontrol kesin. (`notifications.service.ts`)
- **F2 — grup ekleme yetkisi:** `inviteJokerToMatchGroup` artık yalnız anlaşma-kanalı
  katılımcılığına değil, çağıranın **maçtaki iki takımdan birinin** kaptanı/yardımcı kaptanı
  olmasına bakıyor (`getChannelMatchDetails` + `teamRepository`; `removeJokerFromChannel` deseni).
  Joker'in kendini ana gruba eklemesi kapandı. (`chat.service.ts`)

**⏳ AÇIK (henüz yapılmadı):**
- **F6 (ölçek):** `getJokers` tam-tablo Haversine (trig satır başına 2×, index kullanılamaz). Fix:
  index kullanan bounding-box ön-filtre (`latitude/longitude BETWEEN`) sonra hassas Haversine.
- **F7 (orta):** duplicate-davet koruması check-then-insert yarışı + dedup anahtarı `inviterId`'yi
  görmüyor → rakip takım aynı joker'i aynı maça davet edemiyor. Fix: dedup'a inviterId + partial
  unique index + transaction (F1 ile birlikte).

**Bilinçli ertelenen ürün kararları (uygulanmadı, onay bekler):**
- *Roster boyutu = playerCount* sert kapısı YOK (kadro çoğu zaman playerCount'tan büyük; eksik
  gelen oyuncu varken joker meşru). F5'te sadece joker-sayısı tavanı kondu.
- Joker maça girince `isJoker=false` otomatik kapatma YOK (joker hafta içi birden çok *çakışmayan*
  maça girmek isteyebilir).
- **Expire (cron) yolunda** joker temizliği YOK (sadece aktif iptal yolları). Canlıda öksüzlerin
  çoğu EXPIRED gruplarda; bulk-update yapısı nedeniyle ayrı iş.
- **Genel üye budaması:** maç bitince/iptal olunca **takım üyeleri de** maç grubunda kalıyor
  (jokerlere özel değil) → ölçekte sohbet listesi şişer. Ayrı ürün kararı.

### DB notu
Canlı doğrulama 2026-06-28'de salt-okunur yapıldı (Render PG, `?sslmode=require`, sadece SELECT).
Bağlantı dizesi bu repoda **tutulmaz** — gerekirse kullanıcıdan iste (bkz. §9).

---

## 12. İşletme "Reddedildi" → tekrar onaya gönder akışı (2026-06-29 eklendi)

> Önceden eksik olan halka: admin işletmeyi reddedince `Business.status='rejected'` +
> `rejectionReason` yazılıyordu ama (a) sahibe bildirim gitmiyordu, (b) sahibin mobil panelinde
> "rejected" durumu hiç ele alınmıyordu (aktif gibi görünüyordu), (c) düzeltip tekrar gönderme
> yolu yoktu. Bu akış mevcut **saha (pitch) reddedildi → resubmit** desenini taklit eder.

### Server
- **İki yeni bildirim tipi** (`notifications/notification.entity.ts` union):
  `BUSINESS_APPLICATION_APPROVED` ve `BUSINESS_APPLICATION_REJECTED`. Ayrıca
  `notifications.service.ts` içindeki **`businessPushTypes`** whitelist'ine eklendi (yoksa websocket
  emit olur ama FCM push gitmez).
- **AdminModule artık `NotificationsModule`'ü import ediyor** (`admin.module.ts`) → `AdminService`
  constructor'ına `NotificationsService` inject edildi. ⚠️ Mevcut private `admin.service.ts
  sendOwnerNotification` (pitch onay/red için) hâlâ **yalnız DB'ye** yazıyor (ws/push yok); başvuru
  onay/red bilinçli olarak yeni `notifyOwnerOfApplicationResult` helper'ı üzerinden
  `notificationsService.create()` (DB + ws + FCM) kullanır. (İleride pitch bildirimleri de bu yola
  taşınabilir.)
- `approveApplication`/`rejectApplication` (`admin.service.ts`) save sonrası sahibe bildirim atar
  (owner null guard'lı). Mesaj reddetmede: "İşletme başvurunuz reddedildi. Nedeni: {reason}. Lütfen
  düzeltmeleri yapıp tekrar onaya gönderin."
- **Güvenli resubmit ucu:** `PATCH /business-owner/business/resubmit`
  (`business-owner.controller.ts`, **`@UseGuards(JwtAuthGuard)`**). Owner JWT'den (`req.user.id` =
  BusinessOwner.id) çözülür — client status/businessId göndermez. `business-owner.service.ts
  resubmitBusiness(ownerId)`: yalnız `status==='rejected'` iken (`BadRequestException` aksi halde)
  `status='pending'`, `rejectionReason=null`, `reviewedAt=null` yapar; **pitch'lere dokunmaz**.
- `getDashboardSlots` dönüşüne `rejectionReason: business.status` yanına eklendi (banner ekstra
  istek atmasın diye).

### Client (işletme sahibi, `client/`)
- **Dashboard** (`BusinessDashboard.tsx` + `hooks/useBusinessDashboard.ts`): yeni `isRejected`
  tam-ekran pasif durumu. Precedence: **suspended → rejected → abonelik-yok → pending → normal**
  (rejected, abonelik kontrolünden ÖNCE). Red nedeni kartı + "İşletme Bilgilerini Düzenle"
  (`/business/settings/info`) + "Sahaları Düzenle" (`/business/settings/pitches`) + birincil
  **"Tekrar Onaya Gönder"** (ConfirmModal → `api.patch('/business-owner/business/resubmit')` →
  refetch). `handleResubmit`/`resubmitting`/`rejectionReason` hook'tan gelir.
- **Pitch list** (`BusinessPitchList.tsx` + hook): tutarlılık için `isRejected` kırmızı banner
  (red nedeni + "panodan Tekrar Onaya Gönder" yönlendirmesi). Ana yüzey dashboard.
- **Bildirim gösterimi**: değişiklik gerekmedi — `BusinessNotificationBell`/`BusinessNotificationsPage`
  tip-agnostik; yeni bildirim `notificationsService.create` ile room=`owner.id`'ye düşüp otomatik akar.

### Admin panel (`client-admin/`)
- İlk artışta reddetme UI'si zaten vardı; bildirim tamamen server'da. **2. artışta (audit geçmişi)
  admin tarafı da değişti — aşağıya bak.**

### İnceleme geçmişi / audit (reddet → tekrar gönder) — 2. artış (2026-06-29)
> Sorun: `resubmitBusiness` `rejectionReason`'ı null'lıyordu → resubmit sonrası admin önceki red
> nedenini ve "kaçıncı kez" bilgisini göremiyordu. Çözüm: kalıcı **`reviewHistory`** denetim katmanı.
- **`Business.reviewHistory`** (`business.entity.ts`): `@Column({type:'json',nullable:true})`,
  `ReviewEvent[]` = `{action:'submitted'|'rejected'|'resubmitted'|'approved', at:ISO, reason?, by?}`.
  `rejectionReason`/`reviewedAt` KORUNUR (aktif red nedeni); reviewHistory üstüne kalıcı audit.
- **Yazım:** `admin.service.ts` private `appendReview(business,event)` (geçmiş boşsa `createdAt` ile
  'submitted' seed eder). `rejectApplication`→'rejected'(+reason,by:adminId); `approveApplication`→
  'approved'(by:adminId); **`_adminId` artık `adminId` olarak audit'e `by` yazılıyor** (C2 audit-log
  temeli). `business-owner.service.ts resubmitBusiness`→'resubmitted'(by:'owner'), geçmişi KORUR.
- **Admin UI:** `ApplicationsList.tsx` — pending satırda `resubmitCount>0` ise turuncu "↻ Tekrar ×N"
  rozeti (reviewHistory'den türetilir, ek alan yok). `AdminApplicationDetail.tsx` + yeni
  `components/ReviewHistorySection.tsx` — ters-kronolojik "İnceleme Geçmişi" timeline (Red Nedeni
  bölümünden sonra, `ApplicationActions`'tan ÖNCE). Veri otomatik akar (`...business` spread).
- **İmkân (nargile) kaldırma onaysız/doğrudan:** owner `PATCH /pitches/:id` (toggle+kaydet); imkân
  EKLEME ise `pitch_change_requests CUSTOM_FACILITY` ile admin onaylı. Admin imkânları detayda
  `pitch.facilities` üzerinden görür.
- **Tepekent test verisi (2026-06-29):** Tepekent (`f0412a65…`) DB'de `rejected` + reason="Nargile
  salonu imkanını kaldırın" + reviewHistory=[submitted,rejected] olarak seed edildi. Kaldırılacak
  imkân: pitch **"1 No'lu Saha"** (`eda4bb54…`) facilities'indeki **"Nargile kafe"**. `reviewHistory`
  kolonu canlı DB'ye `ALTER TABLE ... ADD COLUMN IF NOT EXISTS "reviewHistory" json` ile elle eklendi
  (entity tipiyle eşleşir; deploy'da synchronize no-op). Deploy sonrası owner nargile'yi kaldırıp
  resubmit edince timeline 'resubmitted' ekler; admin önceki nedeni timeline'da görür.

### ✅ Güvenlik borcu (follow-up) — ÇÖZÜLDÜ (2026-07-01, §20)
`PATCH /businesses/:id` artık `@UseGuards(JwtAuthGuard)` + sahiplik kontrolü (`business.owner.id
=== req.user.id`, aksi halde `ForbiddenException`) + **`UpdateBusinessDto` beyaz listesi** (yalnız
`name/address/city/district/latitude/longitude`; `status/deletedAt` gibi alanlar global
`ValidationPipe(whitelist:true)` ile ayıklanır + service'te açık alan ataması). Owner artık kendini
`active` yapamaz / silinmiş işletme dirilti­lemez. ⚠️ Kalan: aynı controller'daki `POST /businesses`
(kayıt) ve `GET` uçları **hâlâ guard'sız** (asıl yetki-yükseltme vektörü PATCH'ti); POST/GET
sıkılaştırması çağıran denetimiyle ayrı adım.

---

## 13. İşletme "Hazır Notlar" (preset notes) — 2026-06-29 eklendi

> İşletmenin sık kullandığı kısa notları bir kez kaydedip (örn. "Lütfen 15 dk erken gelin"), maç
> onaylarken/sohbete not gönderirken tek dokunuşla seçip göndermesi. Yemeksepeti "hazır not" tarzı.

### Önemli mimari: not GÖNDERME zaten vardı, yeniden kullanılıyor
İşletme→chat tek yüzeyi **rezervasyon not modalı** (MATCH_GROUP). Gönderim mevcut uçlarla yapılır,
DEĞİŞMEDİ: `POST /reservations/:id/business-note {note}` ve onayla-ile-not `POST
/reservations/:id/approve {note}` → `reservations.service.ts` `sendBusinessNote`/`sendSystemMessage`
(sistem mesajı + tüm oyunculara push). **Hazır notlar yalnızca `note` metnini dolduran kolaylık
katmanıdır**; server preset'ten haberdar değil (gönderilen not bağımsız bir ChatMessage olur).

### Server — yeni modül `server/src/preset-notes/`
- **`PresetNote` entity** (`preset_notes` tablosu, synchronize ile otomatik oluşur): `id`,
  `businessId` (`business_id`, `@ManyToOne Business onDelete:CASCADE`), `content` (text),
  `createdAt`/`updatedAt`. **Sadece metin** (ayrı başlık yok); **hard delete** (soft-delete yok).
- **Güvenli owner-JWT deseni** (resubmit/change-password gibi; gevşek `/pitches` deseni DEĞİL):
  controller `@Controller('preset-notes')` + **tüm route'lar `@UseGuards(JwtAuthGuard)`**;
  `req.user.id` = BusinessOwner.id. Service `getOwnerBusinessId(ownerId)` ile owner→business çözer;
  businessId **asla client'tan alınmaz**. Uçlar: `GET/POST /preset-notes`, `PATCH/DELETE
  /preset-notes/:id`. Sahiplik kontrolü: `note.businessId !== ownerBusinessId` → 404. Sınırlar:
  içerik 1..500 karakter, **işletme başına ≤30 not** (`BadRequestException`). DTO
  `CreatePresetNoteDto {content @IsString @IsNotEmpty @MaxLength(500)}` (create+update ortak).
  `app.module.ts`'e `PresetNotesModule` eklendi.

### Client (`client/`)
- **Servis** `services/presetNotes.ts`: `listPresetNotes/createPresetNote/updatePresetNote/
  deletePresetNote` (default `api` instance, Bearer interceptor; businessId göndermez).
- **Yönetim ekranı** `pages/business/BusinessPresetNotes/` (`BusinessPresetNotes.tsx` +
  `hooks/useBusinessPresetNotes.ts`): tam-ekran, ekle/düzenle(satır-içi)/sil(ConfirmModal), boş durum,
  toast. **Ayarlar Hub'ında** ("Saha Ayarları"dan sonra) "Hazır Notlar" menü öğesi (indigo,
  `MessageSquareText`); rota `/business/settings/preset-notes` (App.tsx, lazy).
- **Not modalı entegrasyonu** (asıl özellik) — `BusinessDashboard/components/DashboardActionModals.tsx`
  + `hooks/useBusinessDashboard.ts`: hook mount'ta `listPresetNotes()` → `presetNotes`; modalda
  (hem APPROVE hem SEND_NOTE) "Hazır notlardan seç" açılır listesi (dokun → `setNote(content)`,
  **metin kutusuna yazılır, düzenlenebilir**), **"Bu notu kaydet"** (→ `savePresetFromNote`, trim'li
  dedupe, inline geri bildirim), "Notları Yönet" kısayolu. Gönderme akışı (`handleTransaction`)
  değişmedi.

### Doğrulama
Server `npm run build` ✓ + lint (yalnız önceden var olan 2 sorun). Client `tsc --noEmit` (yalnız
önceden var olan `LocationStep` window.google hatası) + `vite build` ✓. Deploy sonra: Ayarlar→Hazır
Notlar CRUD; Panel→slot→Onayla/Not Gönder→seçici→düzenle→gönder (MATCH_GROUP'a düşer); modalda
"Bu notu kaydet"→hem listede hem Ayarlar'da görünür. DB: `SELECT * FROM preset_notes WHERE business_id='…'`.

---

## 14. Kapalı/dolu saate istek engelleme (backend guard + client uyarı) — 2026-06-29

> Sorun: bir slot "SÜREKLİ DOLU" (sabit/recurring kapatma) olmasına rağmen kullanıcı sayfayı
> yenilemeyip **bayat (stale)** BOŞ görüp istek atabiliyordu; sunucuda engel yoktu.

### Kritik mimari
- **Sabit (recurring), manuel kapatma ve gerçek rezervasyon — hepsi aynı:** `pitchId`+`slotTime` için
  **APPROVED** bir `Reservation`. `recurringClosureId` dolu → **sabit**; `teamId=null` &
  `recurringClosureId=null` → **manuel kapatma**; `teamId` dolu → **onaylı maç (dolu)**.
  Kontrol her zaman **±15 dk pencere** (`Between(windowStart, windowEnd)`) ile materyalize satır
  üzerinden yapılır (runtime kural eşleştirme YOK; recurring closures `blockSlot` + gece cron ile
  60 gün materyalize edilir).
- **Tüm PENDING rezervasyonlar tek metottan geçer:** `ReservationsService.create()`.

### Server — `reservations.service.ts` + 2 çağıran
- Yeni `assertSlotAvailable(pitchId, slotTime)` (±15 dk pencerede APPROVED varsa **`ConflictException`
  (409)** `{ message, code:'SLOT_UNAVAILABLE' }`; mesaj sabit/manuel/dolu'ya göre değişir).
- **3 giriş noktasında** uygulanır (hepsi "istek atma" yüzeyi):
  1. `reservations.service.ts create()` — `isPitchClosedOnDate`'ten sonra. **Evrensel backstop**
     (challenge-kabul, kendi_aramizda, direkt rezervasyon — hepsi buradan geçer).
  2. `match-announcements.service.ts create()` — slot çakışma kontrollerinden sonra, ilan
     **kaydedilmeden ÖNCE** (kendi_aramizda rezervasyonu try/catch ile yutulduğundan asıl engel burada).
  3. `challenges.service.ts create()` — `match` fetch'i challenge kaydından öne alındı; sonra
     `assertSlotAvailable(match.pitchId, istanbulDateTimeToUtc(match.date, match.time))`.
- Not: slot kapatılınca `blockSlot()` zaten mevcut PENDING istekleri reddedip ilanları iptal ediyor;
  guard'lar **yeni** isteklerin (bayat görünüm) düşmesini kapatır.

### Client (`client/`) — uyarı + otomatik yenileme
- `pages/customer/PitchBooking/hooks/usePitchBooking.ts`: inline reservations fetch →
  `refetchReservations` (useCallback); `slotWarning` state; `handleSendOffer` (challenge) artık
  409/`SLOT_UNAVAILABLE`'da `slotWarning` set eder + `refetchReservations()` (eskiden hatayı yutuyordu).
- `components/Modals/CreateMatchModal.tsx`: yeni `onSlotConflict` prop'u; 409'da kendi `refreshBookedSlots`'unu
  ve üst listeyi (`onSlotConflict=refetchReservations`) yeniler; server mesajı satır-içi gösterilir.
- `PitchBooking.tsx`: `slotWarning` → uyarı `ConfirmModal`'ı ("Bu saat artık müsait değil").
- Client 409'u `error.response.status===409 || data.code==='SLOT_UNAVAILABLE'` ile algılar; slot listesi
  yenilenince `PitchSchedule.tsx` slotu otomatik **SABİT/KAPALI/DOLU** render eder.

### Doğrulama
Server `npm run build` ✓ + lint (yalnız önceden var olan e2e parse hatası + `any`-DTO uyarıları). Client
`tsc --noEmit` (yalnız önceden var olan `LocationStep` window.google) + `vite build` ✓. Manuel: sabit/manuel
kapalı veya dolu bir slota ilan aç / meydan oku / challenge kabul → 409 + net uyarı; yeni PENDING rezervasyon
oluşmaz.

---

## 15. Dış bildirim (push notification) mimarisi ve düzeltmeleri — 2026-06-30

> iOS'ta tespit edilen 3 sorun (mimari ortak → Android'de de geçerli) giderildi. FCM altyapısı:
> Firebase Admin (`server/src/firebase/firebase.service.ts sendToDevice`), client
> `@capacitor-firebase/messaging` (`client/services/pushNotificationService.ts`). Bildirimler
> `notifications.service.ts create()` üzerinden DB + websocket (`gateway 'notification'`) + FCM.

### Kritik mimari: push token TEK kolon modeli
- Token **tek `pushToken` varchar kolonu** olarak hem `user` hem `business_owner` satırında tutulur
  (ayrı tablo/platform/isActive YOK). Client rol'e göre `PATCH /users/push-token` veya
  `/business-owner/push-token`'a yazar. **Bir cihaz = bir hesap** (çok-cihaz/çok-hesap aynı kolonda olmaz).

### Sorun 1 — bildirimlerde emoji/ikon (çözüldü, "her yerde temiz")
- **Kaynak temizliği:** sistem-üretimi tüm bildirim `title`/`message` literallerinden dekoratif emoji
  çıkarıldı (`notifications.service.ts`, `reservations.service.ts` ~12 literal, `chat.service.ts`
  REMATCH/CHALLENGE başlıkları). Bu hem DB'ye yazılanı hem in-app zili temizler.
- **Push sınırı güvenlik ağı:** `notifications.service.ts cleanPushText()` (emoji `\p{Extended_Pictographic}`
  + VS16/ZWJ strip → whitespace sadeleştir → trim → uzunluk sınırı) `create()` push'larında
  title+body'ye uygulanır. **Sohbet push gövdesine UYGULANMAZ** (kullanıcı emoji'si meşru) — onun
  yerine `stripChatMarkers()` `{{TOKEN}}`/`[ICON:..]` işaretlerini temizler (eskiden push'a ham
  `{{STADIUM}}` gidiyordu — ayrı hataydı). Sohbet başlığı yalnız whitespace/uzunluk normalize edilir
  (gönderen adındaki emoji'ye dokunulmaz).
- **In-app (tarihsel kayıtlar dahil):** `client/utils/notificationText.ts stripNotificationEmoji()`
  (⚠️ **'u' bayrağı YOK** — eski/MIUI WebView `\p{}`/`u` desteklemeyip parse-time kırabilir; surrogate
  çiftleri + BMP sembol aralıkları açıkça taranır). `NotificationItem.tsx` (müşteri),
  `BusinessNotificationsPage.tsx` + `BusinessNotificationsPanel.tsx` (işletme) title+message'a uygular.

### Sorun 2 — hesap değişiminde eski hesabın bildirimi (çözüldü)
- **Kök neden:** çıkışta token temizlenmiyordu + kayıtta token diğer hesaplardan çözülmüyordu →
  aynı cihaz token'ı birden çok hesaba bağlanıyordu (canlı kanıt: `ctRnr6BN…` 3 user + 1 owner'da).
- **Birincil fix — unbind-on-register:** `UsersService.updatePushToken` /
  `BusinessOwnerService.updatePushToken` artık **tek transaction** içinde token'ı HER İKİ tablodaki
  diğer satırlardan NULL'lar, sonra çağırana yazar → bir token global olarak tek hesaba bağlı. App
  start/login'de yeniden kayıt olduğu için **mevcut bozulmayı kendi kendine iyileştirir** (deploy +
  cihaz açılışı sonrası baseline sorgu boşalır).
- **Çıkış temizliği (savunma derinliği):** `@Delete('push-token')` (her iki controller, JwtAuthGuard,
  yalnız çağıranın satırını **id ile** temizler). Client `AuthContext.logout()` →
  `unregisterPushOnLogout()` (`pushNotificationService.ts`): clearAuthSession'dan ÖNCE DELETE çağrısı +
  `FirebaseMessaging.deleteToken()` + `localStorage 'pushToken'` sil + `resetPushNotifications()`
  (`_initialized=false` + `removeAllListeners()` → listener birikmesi/erken-return düzeltir).

### Sorun 3 — uygulama ön plandayken push (çözüldü, "sessiz")
- **Gateway presence:** `app.gateway.ts` `activeUsers: Map<userId, sayaç>` (boolean değil SAYAÇ —
  çok-soket). Bağlan→+1 (foreground varsay), `presence:active`/`presence:inactive` (client emit),
  disconnect→-1. `isUserActive(userId)` push baskılamada okunur. `pingInterval/pingTimeout=10s` (ölü
  soketi hızlı düşür; swipe-kill'de `presence:inactive` ulaşmazsa fallback).
- **Baskılama:** `isUserActive(recipient)` true ise FCM gönderilmez — `create()` (user+owner yolu),
  `sendChatPushToParticipants` (alıcı bazında filtre), ve 4 doğrudan-push metodu
  (joinRequest/playerRemoved/joinRequestAccepted/jokerInvite). Uygulama-içi websocket olayı
  (`'notification'`/`'newMessage'`) zaten iletildiğinden in-app rozet/liste anlık güncellenir, banner çıkmaz.
- **Client:** `App.tsx appStateChange` → öne gelince `socket.emit('presence:active')` (+clearBadge),
  arka plana alınınca **ilk satırda (await'siz)** `socket.emit('presence:inactive')` (`window.__socket`).
- İşletme sahibi JWT'si de `JWT_SECRET` ile imzalı → owner soketleri de bağlanır, presence owner için çalışır.

### Doğrulama
Server build ✓ + lint (yalnız önceden var olan e2e + `any` uyarıları). Client `tsc --noEmit` (yalnız
önceden var olan `LocationStep`) + `vite build` ✓. `cleanPushText`/`stripNotificationEmoji` node ile
test edildi (tüm emoji gider, `·`/`—`/Türkçe korunur). DB baseline (salt-okunur) alındı; **deploy + cihaz
açılışı sonrası** `SELECT "pushToken",count(*) FROM "user" ... HAVING count(*)>1` ve user↔owner ortak token
sorguları BOŞ dönmeli. **Opsiyonel:** mevcut `ctRnr6BN…` 4'lü bağlanması için tek seferlik SQL dedupe
(canlı yazma, onayla) — yoksa ilk yeniden-kayıtta kendi kendine iyileşir. Client değişiklikleri (çıkış
temizliği + presence) **yeni native sürüm** ister; sunucu eski client'larla da doğru çalışır.

> **Güncelleme (2026-06-30):** §15 tek seferlik DB temizliği **yapıldı** (onaylı): `ctRnr6BN…`'in
> 3 user + 1 owner kopyası NULL'landı; doğrulama sorguları boş döndü. Commit'ler `0a1d0b9` (server) +
> `1302b34` (client) `main`'e push'landı, Render'da aktif.

---

## 16. Socket gerçek-zaman + ön plan push düzeltmesi (KRİTİK, 2026-06-30)

> §15 deploy sonrası iki belirti: (1) sohbetteyken mesaj anlık gelmiyor (çık-gir → REST refetch ile
> görünüyor), (2) ön plan push baskılaması çalışmıyor (push gelmeye devam). **Tek kök neden.**

### Kök neden: açılışta socket HİÇ bağlanmıyordu (auth refactor regresyonu)
- `AuthProvider` oturumu **async** yükler (`initAuth()`, Capacitor Preferences) ve state set eder ama
  açılışta `auth:tokenChanged` **göndermiyordu**. `SocketProvider` ise mount'ta senkron `getToken()`
  ile bağlanmayı deniyordu. React **çocuk effect'leri ebeveynden ÖNCE** çalıştırır → SocketProvider
  effect'i `initAuth` daha çağrılmadan çalışıp token'ı `null` görüyor, bir daha denemiyordu →
  **socket tüm oturum kapalı.** Sonuç: `newMessage` ulaşmaz + sunucu kullanıcıyı aktif görmez
  (`isUserActive=false`) → ön plan push'u baskılanmaz. ~2 ay önceki senkron `localStorage` → async
  Preferences refactor'ının (`da5dcc3`) gizli regresyonu; push+REST belirtiyi maskeliyordu.
- **Kanıt:** canlı test — taze client deploy edilmiş sunucuya WS ile **233ms'de** bağlandı (sunucu
  sadece geçersiz test token'ı için düşürdü) → sunucu/WS sağlıklı, sorun %100 client.

### Düzeltme (yalnız client — yeni native sürüm ister; sunucu DEĞİŞMEDİ)
- **`SocketContext.tsx`** artık **token-driven**: `useAuth()` token'ına bağlı tek `useEffect([token])`.
  Token gelir gelmez bağlanır; login/logout/hesap-değişimi/expiry token state'iyle yönetilir.
  **StrictMode açık** (`index.tsx`) → cleanup closure'daki `s`'i kapatır, `socketRef`/`__socket`/state'i
  **`=== s` koşuluyla** temizler (ikinci çalıştırmanın socket'ini null'lamaz). io opsiyonları sertleşti:
  `reconnectionAttempts: Infinity` (eski `10` kalıcı pes ediyordu), `transports:['websocket','polling']`
  (fallback), `reconnectionDelay 1000`/`Max 5000`. connect/disconnect/connect_error log'lanır.
- **`AuthContext.tsx`**: artık ölü `auth:tokenChanged` dispatch'leri (4 adet) kaldırıldı; token state
  değişimi socket'i sürüyor. **`auth:sessionExpired` KORUNDU** (api.ts 401 → token=null → socket teardown).
- **`App.tsx`** `appStateChange` isActive: ölü socket'i `sock.connect()` ile canlandırır (iOS arka
  planda askıya alır), sonra `presence:active`.
- **`useNotifications.ts`**: `(window as any).__socket` (deps `[]`, reconnect'te bağlanmıyordu) yerine
  reaktif `useSocket()` + `[socket]`.
- ⚠️ **Edge — bozuk/expired token reconnect fırtınası:** `Infinity` ile sonsuz dener; 401→`sessionExpired`
  →token=null teardown ile durur, `reconnectionDelayMax` sınırlar, `initAuth` expired token'ı null'lar.

### Neden ön plan push'u da düzelir
Socket ön planda güvenilir bağlanınca sunucu `handleConnection`'da kullanıcıyı aktif işaretler →
`isUserActive=true` → FCM atlanır. `1302b34`'teki `presence:active/inactive` emit arka planı hassaslaştırır.

### Doğrulama
Client `tsc --noEmit` (yalnız önceden var olan `LocationStep`) + `vite build` ✓ + `npx cap sync` ✓
(CocoaPods encoding hatası için `LANG=en_US.UTF-8` gerekti). Cihazda: açılışta `[socket] connect` log'u +
sunucuda `Client connected`; 2 cihaz aynı sohbette anlık mesaj; ön planda push gelmez, arka planda gelir;
resume'da otomatik reconnect. **Fallback:** düzeltme sonrası hâlâ aksarsa Render **instance sayısını**
kontrol et (>1 ise `server.to(room)`/in-memory presence instance-başına çalışır → Socket.IO Redis adapter
gerekir; mevcut ölçekte tek instance, canlı test tek instance'a bağlandı).

> **TestFlight doğrulaması (2026-06-30):** Socket fix Mehmet42'de ÇALIŞTI (ön planda push gelmiyor,
> kapatınca geliyor). §16 commit `4cfc4af` `main`'e push'landı.

---

## 17. TestFlight test bulguları: FCM öz-iyileşme, çift bildirim, çift gönderim (2026-06-30)

### A. Push görünürlüğü + öz-iyileşme + presence sağlamlığı (sunucu)
- **Kök sorun (Yasin'de hiç push gelmiyordu):** FCM hataları **sessizce yutuluyordu**
  (`.catch(()=>{})` / `allSettled` sonucu okunmuyor) → stale/geçersiz token (örn. yeni build'de bildirim
  izni reddedilmiş, eski install'un token'ı kalmış) görünmez şekilde başarısız oluyordu.
- **`firebase.service.ts sendToDevice`** artık `{ success, invalidToken }` döndürür; hata kodunu loglar
  (`registration-token-not-registered`/`invalid-registration-token`/`invalid-argument` → invalidToken).
- **`notifications.service.ts`**: tüm 7 FCM çağrısı yeni `pushToUser`/`pushToOwner` helper'larından geçer;
  `invalidToken` true ise o satırın token'ı `UPDATE … SET pushToken=NULL WHERE id=$1 AND pushToken=$2` ile
  temizlenir (yarış-güvenli). Böylece geçersiz token bir kez başarısız olunca null'lanır + Render log'unda
  görünür (teşhis). Kullanıcı aksiyonu: cihazda bildirim izni açık olmalı, sonra uygulama açılınca taze token kaydolur.
- **`app.gateway.ts` presence** sayaç (`Map<userId,number>`) yerine **`Map<userId,Set<socketId>>`** oldu.
  add/remove idempotent (her socket.id kendi disconnect'inde koşulsuz silinir) → kaçan/çift event ile
  "takılı kalma" (isUserActive hep true → tüm push baskılanır) riski **imkânsız**. `isUserActive` sync kaldı.

### B. İşletme notunda çift bildirim → tek bildirim (sunucu)
- İşletme not gönderince oyuncu 2 push alıyordu: `BUSINESS_NOTE` bildirimi + sohbet sistem mesajının push'u.
- **`chat.service.ts sendMessage`** imzasına `skipPush=false` eklendi; push tetikleyen blok `if (!skipPush)`.
  Diğer tüm çağıranlar varsayılan false → değişmez. `reservations.service.ts sendSystemMessage`'a `skipPush`
  geçirildi; **`sendBusinessNote`** ve **onay-ile-not (`approve` MATCH_APPROVED sistem mesajı)** `skipPush=true`
  verir → sistem mesajı sohbete düşer ama chat push'u atılmaz; dedike bildirim (BUSINESS_NOTE / "Maçınız
  Kesinleşti!") tek push olarak kalır.

### C. Sohbette çift gönderim (client → yeni build)
- **`useChat.ts handleSend`**: `sendingRef` re-entry guard + `isSending` state; input **await'ten ÖNCE**
  temizlenir (ikinci dokunuş boş input'la erken döner); hata → metin geri yüklenir; `finally` reset.
- **`Chat.tsx`** gönder butonu `disabled={isSending || !input.trim()}`.

### Doğrulama
Server build ✓ + lint (yalnız önceden var olan e2e + any). Client `tsc` (yalnız `LocationStep`) + build ✓ +
`cap sync` ✓. Deploy sırası: önce sunucu (A+B — TestFlight'a anında etki), sonra client (C) yeni native sürüm.
Deploy sonrası Render log'u her alıcının FCM sonucunu (`FCM gönderildi` / `FCM send failed (code)`) net gösterir.

---

## 18. Push token oluşmuyor — §16/§17'nin yan etkileri (2026-06-30)

> Belirti: Yasin'de `pushToken=NULL` ve izin verse de yeni token oluşmuyordu; Mehmet42 (çıkış yapmamış)
> sorunsuz. iOS native yapı doğru (aps-environment=production). İki bağımsız regresyon — ikisi de bu
> haftaki push işinden:

### Bug 1 (client) — çıkışta `deleteToken()` token üretimini bozuyordu
- §16'da eklenen `unregisterPushOnLogout` `FirebaseMessaging.deleteToken()` çağırıyordu. iOS'ta deleteToken
  sonrası APNs yeniden tetiklenmediği için `getToken()` null döner; üstelik `_initialized=true` getToken'dan
  ÖNCE set ediliyordu (tekrar deneme yok) ve `removeAllListeners()` tokenReceived güvenlik ağını kaldırıyordu.
  → **çıkış yapan kullanıcı yeniden kaydolamıyordu**.
- **Düzeltme (`pushNotificationService.ts`):** `deleteToken()` + `removeAllListeners()` + `resetPushNotifications`
  + logout'taki `localStorage.removeItem` **kaldırıldı**. Listener'lar `_listenersAdded` ile **bir kez**
  kurulur (idempotent `setupListeners`), token **her `initializePushNotifications` çağrısında** yeniden
  alınıp gönderilir (tek-seferlik guard yok). `unregisterPushOnLogout` artık **yalnız server DELETE**
  (hesap-değişimi güvenliği DELETE + unbind-on-register'da; cihaz token'ı silinmez). `useBusinessRegister`
  kayıt sonrası `initializePushNotifications()` eklendi (eksikti).

### Bug 2 (server) — `invalid-argument` geçerli token'ı siliyordu
- §17'deki FCM cleanup `messaging/invalid-argument`'i invalidToken sayıyordu; ama FCM bunu **bozuk payload**
  (örn. boş gövde) için de döndürür → geçerli token yanlışlıkla NULL'lanıp döngüye giriyordu.
- **Düzeltme (`firebase.service.ts`):** invalidToken artık yalnız `registration-token-not-registered` +
  `invalid-registration-token` (token'a özgü kesin hatalar). `invalid-argument` loglanır ama token silinmez.

### Anında kurtarma + deploy
Server Fix 2 deploy → geçerli token bir daha silinmez. Yasin **uygulamayı sil-kur + izin** → temiz token
kaydolur. Kalıcı çözüm (deleteToken'sız akış) yeni client build ile. **Önce server, sonra client build.**
Doğrulama: server build/lint ✓, client tsc/build/cap sync ✓ (yalnız önceden var olan hatalar).

---

## 19. Çift-tıklama = çift istek: uygulama-geneli backend guard (2026-07-01)

> Sorun: hızlı çift/üçlü tıklama backend'de çift kayıt VE çift bildirim oluşturabiliyordu. Client
> guard'ları (isLoading/isSending) bazı butonlarda vardı ama backend'de **check-then-insert yarışı**
> mevcuttu (challenges/joker/join-request/rating/team/reservation), ayrıca 8+ kabul/ret butonu client
> guard'sızdı. İstek: garantinin **backend'de** verilmesi.

### Çözüm: global `DuplicateRequestInterceptor` (yalnız sunucu → mevcut sürümlere anında etki)
- `server/src/common/duplicate-request.interceptor.ts` + `main.ts app.useGlobalInterceptors(...)`.
- Yalnız mutasyon (POST/PATCH/PUT/DELETE). Anahtar = `(user.id||ip) | method | path | sha1(stableJSON(body))`.
- **In-flight + 5sn TTL:** aynı anahtarlı duplicate handler'ı TEKRAR ÇALIŞTIRMAZ; ilk isteğin **aynı
  yanıtını** döndürür (409 yok, client hata görmez). Handler tam bir kez → **tek kayıt + tek bildirim**
  (bildirim de handler içinde üretildiğinden çift gitmez). Hata → anahtar hemen silinir (gerçek retry çalışır).
- **Skip:** sohbet mesajı (`/chat/channels/:id/messages` — meşru ardışık aynı mesaj) + `/files/upload`
  (multipart). GET vb. dokunulmaz.
- In-memory (tek Render instance varsayımı; çok-instance'ta Redis'e taşınmalı).

### Doğrulama
Server build ✓ + lint ✓ (yalnız önceden var olan e2e + any). Derlenmiş interceptor'a karşı davranış testi
(node, 6/6): aynı-key eşzamanlı → handler 1 kez + aynı yanıt; farklı body/farklı user → 2 kez; chat mesaj
skip → 2 kez; hata→retry → 2 kez; GET → 2 kez. **Client değişmez.** Deploy: yalnız server (Render).

---

## 20. Kritik güvenlik düzeltmeleri: business PATCH + seed endpoint + joker yetki (2026-07-01)

> Denetim (agent.md) sonrası açık kalmış kritik maddelerden kullanıcının seçtiği 3'ü kapatıldı.
> RBAC (§8/C1) bilinçli kapsam dışı (tek `admin` yeterli, tek başına çalışılıyor). **Hepsi yalnız
> server → mevcut mobil sürümlere anında etki; client DEĞİŞMEDİ.** Görev 3 (`synchronize:true`) ve
> Görev 4 (user-delete transaction) kullanıcı tarafından **ayrı task'a** bırakıldı (§8/D3, D4).

### 1. `PATCH /businesses/:id` yetki-yükseltme açığı (§12 follow-up) ✅
- **Sorun:** uç guard'sızdı ve `Object.assign(business, body)` ile **status dahil** her alanı
  yazıyordu → owner (hatta token'sız biri geçerli businessId ile) kendini `active` yapabilir /
  silinmiş işletme diriltebilir / audit alanlarını ezebilirdi.
- **Fix:** yeni `business/dto/update-business.dto.ts` (beyaz liste: yalnız `name/address/city/
  district/latitude/longitude`); `business.controller.ts` PATCH'e `@UseGuards(JwtAuthGuard)` + body
  DTO'ya bağlandı + `req.user.id` service'e geçiyor; `business.service.ts update(id,dto,ownerId)`
  sahiplik kontrolü (`business.owner.id !== ownerId` → `ForbiddenException`) + `Object.assign`
  yerine açık alan ataması. Global `ValidationPipe(whitelist:true)` fazla alanları zaten ayıklar
  (çift katman). Client tek çağıran `BusinessInfoSettings` yalnız bu 6 alanı gönderiyor → bozulmaz.
- ⚠️ **Kalan:** aynı controller'daki `POST /businesses` (kayıt) + `GET` uçları hâlâ guard'sız
  (asıl vektör PATCH'ti); POST/GET sıkılaştırması çağıran denetimiyle ayrı adım.

### 2. Korumasız seed endpoint (§8/C3) ✅
- **Sorun:** `POST /admin/maintenance/seed-subscriptions` guard'sızdı; tek koruma env yoksa koda
  gömülü `'dimli-seed-2026'` → repo'yu görebilen herkes tüm abonelikleri oluşturup/değiştirebilirdi.
- **Fix:** `@UseGuards(AdminJwtAuthGuard)` eklendi; sabit secret fallback'i ve `secret` parametresi
  tamamen kaldırıldı. Artık tüm admin uçları guard'lı — istisna yok.

### 3. Joker davet yetkilendirmesi (§11 F1+F2) ✅
- **F1** (`sendJokerInvite`): çağıran `match.team`'in kaptanı/yardımcı kaptanı değilse
  `ForbiddenException` (davet her zaman `match.team` adına gider → kontrol kesin).
- **F2** (`inviteJokerToMatchGroup`): çağıran maçtaki iki takımdan birinin kaptanı/yardımcı kaptanı
  olmalı (`getChannelMatchDetails` + `teamRepository`; `removeJokerFromChannel` deseniyle birebir)
  → joker kendini ana gruba ekleyemez. F6 (Haversine ölçek) / F7 (dedup index) hâlâ açık.

### Doğrulama
`cd server && npm run build` ✓ + `npm run lint` temiz (yalnız önceden var olan e2e parse + `any`
uyarıları). Canlı DB salt-okunur teyit (2026-07-01): business/subscription tablolarında bu açıkların
kötüye kullanıldığına dair iz YOK. Deploy: **yalnız server (Render)**; eski client'larla uyumlu.

---

## 21. Server yapısal denetim + tip güvenliği turu (T1-T2-T3, 2026-07-01)

> `server/` kapsamlı yapısal denetim yapıldı (ölü kod, `any`, modülerlik, büyük dosyalar, DB
> tablo/kolon kullanımı). Bulgulardan kullanıcının seçtiği **T1 (controller `@Body:any`→DTO), T2
> (reservations `any` temizliği), T3 (odaklı `any`/tip güvenliği)** uygulandı. **Yalnız server;
> client DEĞİŞMEDİ.**

### T1 — Controller DTO'ları + pitches güvenlik + orphan temizliği ✅
- **T1.1 (pitches — §20 "kalan"ı kapatır):** `pitches.controller.ts` tüm 7 mutasyon ucu (`POST`,
  `PATCH :id`, `:id/resubmit`, `:id/status`, `:id/closed-days`, `PUT :id/time-slots`, `DELETE :id`)
  artık `@UseGuards(JwtAuthGuard)` + **sahiplik kontrolü** (`pitches.service`
  `assertPitchOwnedBy`/`assertBusinessOwnedBy`, pitch→business→owner). Yeni `pitches/dto/*` (Create/
  Update/Resubmit/TimeSlot/ClosedDays/SetTimeSlots). → **saha kendini `approvalStatus:'approved'`
  yapamaz**, kimliksiz biri fiyat/silme yapamaz. GET uçları müşteri için AÇIK bırakıldı (guard yok).
- **T1.2:** `teams/dto/create-team.dto.ts` — captainId/fairPlayScore DTO'da yok (whitelist ayıklar).
- **T1.3:** `subscription/dto/revenuecat-webhook.ts` — **class-DTO değil INTERFACE** (`import type`);
  webhook gerçek event'i `body.event` içinde iç içe → katı whitelist `event`'i düşürüp CANLI
  entegrasyonu bozardı. Controller `@Body` tipi düzeldi; `handleWebhook` iç `any`'si (harici, kabul).
- **T1.4:** orphan `POST /businesses` route + `businessService.create()` **silindi** (hiç çağıranı
  yoktu; auth kaydı `new Business()`+`queryRunner.save`, business-owner `businessRepository.save`).
  → §20'deki "kalan POST /businesses" maddesi de böylece kapandı.

### T2 — reservations.service `any` temizliği ✅
- **33 `any` → 0.** `team.captain` gerçek `@OneToOne` ilişki, sorgularda yüklü → cast'ler savunma
  amaçlıydı, **runtime birebir aynı** (yetki kontrolleri 2268/2271/2351/2354 dahil güvenlik
  zayıflamaz). `any[]`→`User[]`, `savedReservation.id`, `CreateReservationDto`, `EntityManager`/
  `Team`/`Record<string,unknown>` paramları, `null as unknown as Date`. Caller `challenges.service`
  `'MATCH' as const`.

### T3 — Odaklı `any`/tip güvenliği (yapılanlar) ✅
- **T3.6** `catch (error: unknown)` + narrowing (auth/teams controller, sms.service).
- **T3.4** `business-owner.create(dto: DeepPartial<BusinessOwner>)` + `auth.service.registerBusinessOwner`.
- **T3.1** entity ilişki tipleri: `challenge.entity` (fromTeam/match), `user.entity` (team) →
  **`import type` + gerçek tip** (string relation formu KORUNUR; nodenext'te `import type` ZORUNLU).
  **Sıfır cascade** (kod optional-chaining/truthy kullanıyor). Yan etki: eslint --fix
  `match-announcements.service` `user.team.id as string`→`user.team.id` (gereksiz cast kalktı).
- **T3.3** passport payload: yeni `auth/types.ts` `JwtPayload`; jwt/admin-jwt strategy `payload:
  JwtPayload`; admin guard `handleRequest<TUser>(err: unknown, user)` (base generic imzası).
- **T3.2** `pitch-change-request.entity` `requestedData`/`currentData` → `PitchChangeData`
  (`facility?/facilities?:string[]/imageUrl?`; ⚠️ `pitch.facilities` `string[]` simple-array).

### T3 — Bilinçli ERTELENENLER → **§68'de KAPANDI (2026-07-11)**
- **business-owner dashboard enrichment cast'leri** (`(res.team as any).playedMatchCount` — entity'ye
  ad-hoc alan MUTASYONU + `(r:any)` callback'lerinde slotTime/status-enum bağı; canlı dashboard
  regresyon riski). Fix: `Team & {playedMatchCount?...}` tipli cast + `r.status===ReservationStatus.X`.
- **chat/notification `metadata: any`** (gerçekten polimorfik; katı tip yüzlerce yazımı bozar,
  index-signature güvenlik katmaz). **auth.service** `validateUser/login/loginBusinessOwner`
  param+return tipleri (`Express.User` augmentation'ına bağlı cascade).
- Ayrıca üst-seviye backlog: **büyük dosya bölme** (T4-T6 tanrı-servisler: reservations 2427 / chat
  1812 / admin 1237 satır), `@nestjs/config`, global exception filter. (chat.service raw-SQL tipleme
  ve `noImplicitAny:true` §68'de yapıldı.)

### Denetimden çıkan kalıcı bilgiler (DB, salt-okunur 2026-07-01)
- **Şema entity'lerle TAM hizalı:** 26 tablo/249 kolon hepsi entity'lerle eşleşiyor → `synchronize:
  true`'ya rağmen **öksüz tablo/kolon YOK**.
- **`facilities` tablosu = 14 default imkânın ana referans listesi** (ölü DEĞİL); `pitches.facilities`
  bunları **`simple-array` (string[])** olarak DENORMALIZE tutar + özel eklenenler inline (FK yok).
- **`user_blocks` KULLANILIYOR** ama şu an 0 satır (özellik bağlı, veri yok — ölü değil).
- RevenueCat kolonları dolu (4/4), push token adopsiyonu user 7/15 & owner 2/4 → aktif özellikler.
- Kod hijyeni iyi: ölü dosya/yedek/dead-comment/duplicate-util YOK; yardımcılar merkezî.
- **nodenext dersi (§ tsconfig):** decorated signature'da (`@Body`, `@ManyToOne` alanı) kullanılan
  INTERFACE/type `import type` ile alınmalı (TS1272), yoksa build kırılır.

### Doğrulama
`npm run build` ✓ (exit 0); `npm run lint` **iyileşti** (önceki 4 sorun → 1; yalnız önceden var olan
e2e parse hatası kaldı, 3 eski `any` uyarısı da temizlendi). reservations.service `any` sayısı 0.
**Deploy: yalnız server (Render); client değişmedi, eski sürümlerle uyumlu.**

---

## 22. Tanrı-servisleri bölme — 1/3: admin.service (facade + delegation, 2026-07-01)

> agent.md §21'de tespit edilen 3 tanrı-servisten **ilki**: `admin.service.ts` (1237 satır) cohesive
> alt-servislere bölündü. reservations (2427) ve chat (1812) **ayrı task**. **SIFIR davranış
> değişikliği** — yalnız kod organizasyonu.

### Desen: Facade + Delegation
- `AdminService` bir **facade** olarak kalır: 26 public metot birebir imzayla alt-servislere delege eder.
  → `admin.controller` + dış çağıranlar DEĞİŞMEDİ. Metot gövdeleri **VERBATIM** taşındı (mantık aynı).
- **1237 → 150 satır** (facade). Mantık `admin/services/` altında 8 dosyaya dağıldı:
  - `admin.util.ts` — `applySearch()` + `PLAN_LABELS` + `PITCH_COUNT_TO_PLAN` (paylaşılan util).
  - `admin-stats-cache.service.ts` — `AdminStatsCacheService`: `statsCache` Map + `cached()` + `bust()`.
    **Cache invalidation decouple edildi:** mutasyon servisleri (business/subscription) `bust('statistics')`
    çağırır; statistics/moderation `cached()` kullanır (eski facade-içi 6 `statsCache.delete` çağrısı taşındı).
  - `admin-auth.service.ts` (login/createAdmin), `admin-business.service.ts` (`listBusinesses` çekirdeği
    + başvurular + işletme yaşam döngüsü + `appendReview` + `notifyOwnerOfApplicationResult`),
    `admin-pitch-review.service.ts` (saha onayları + değişiklik istekleri + `sendOwnerNotification`),
    `admin-moderation.service.ts` (şikayet + chat-ban + silme raporu), `admin-statistics.service.ts`,
    `admin-subscription.service.ts` (`seedMissingSubscriptions`).
- `admin.module.ts`: 7 alt-servis + `AdminStatsCacheService` `providers`'a eklendi; `forFeature`/import'lar
  (Facilities/Notifications/Jwt) korundu. Alt-servisler export edilmez (dahili).
- ⚠️ **İki bildirim deseni bilinçli AYRI:** `notifyOwnerOfApplicationResult` (başvuru → ws+FCM,
  `notificationsService.create`) business-service'te; `sendOwnerNotification` (saha/değişiklik → DB-only,
  `notificationRepository`) pitch-review'da. Birleştirilmedi.
- ⚠️ **Facade imza korundu (kritik):** `admin.controller` `Parameters<AdminService['updateApplication']>[1]`
  kullanıyor → facade `updateApplication` imzası `Parameters<AdminBusinessService['updateApplication']>[1]`
  ile türetildi.

### Doğrulama
`npm run build` ✓ (exit 0) + `npm run lint` temiz (yalnız önceden var olan e2e parse). Temiz rebuild
sonrası `require('./dist/app.module.js')` OK (import interop + DI grafiği bütün; tüm alt-servisler
providers'da, repo'lar forFeature'da). Yalnız server; deploy Render. Deploy sonrası admin panel akışları
smoke-test önerilir (giriş/başvuru/işletme/saha/şikayet/istatistik/seed).

### Sıradaki (ayrı task)
- **reservations.service (2427)** bölme — facade + Query/RecurringClosure/Proposal/Lifecycle/Support.
- **chat.service (1812)** bölme — facade + Message/Channel/Rematch/Joker/Membership (forwardRef korunur).
- Ertelenen T3 tip kalemleri (business-owner enrichment, chat/notification metadata, auth.service login).

---

## 23. Tanrı-servisleri bölme — 2/3: reservations.service (facade + delegation, 2026-07-02)

> Serinin 2/3'ü (§22 admin tamamlandı). `reservations.service.ts` (2427 satır) cohesive alt-servislere
> bölündü. **SIFIR davranış değişikliği** — metot gövdeleri **`sed` ile BYTE-IDENTICAL** çıkarıldı
> (elle yeniden yazım YOK → transcription hatası sıfır); yalnız helper referansları rewire edildi.

### Desen (admin ile aynı) + reservations'a özgü incelikler
- `ReservationsService` **facade**: 24 public metot birebir imzayla delege eder → controller + dış
  çağıranlar (business-owner, match-announcements, challenges, chat) DEĞİŞMEDİ. **2427 → 137 satır.**
- 5 alt-servis (`reservations/services/`), döngüsüz bağımlılık: **Support**←(Lifecycle,Proposal,Recurring);
  **Lifecycle**←Recurring; **Query** bağımsız.
  - `reservation-support.service.ts` — `sendSystemMessage` + `cleanupJokersOnMatchCancel` (her ikisi de
    `manager: EntityManager` parametreli → repo enjeksiyonu yok; chatService + notificationsService).
  - `reservation-query.service.ts` — 7 saf okuma (reservationRepository).
  - `reservation-lifecycle.service.ts` (**1626 satır** — approve 550 satırlık transaction BÜTÜN taşındı) —
    create/approve/cancel/iptal-akışları + assertSlotAvailable + `checkMatchReminders(@Cron EVERY_MINUTE)`.
  - `reservation-proposal.service.ts` — proposeTime/acceptProposal.
  - `reservation-recurring.service.ts` — closure metotları + blockSlot + `topUpRecurringClosures(@Cron
    EVERY_DAY_AT_3AM)`; `removeRecurringClosure → lifecycle.revokeConfirmation`, `blockSlot →
    support.sendSystemMessage`.
- ⚠️ **@Cron facade'de YOK** — dekoratörler taşındıkları alt-serviste (provider) kalır; ScheduleModule
  tarar → tetiklenir. Gerçek `@Cron(` dağılımı: lifecycle 1 + recurring 1 (facade 0) → **çift-fire yok**.
- ⚠️ **Transaction'lar korundu:** 11 `dataSource.transaction` kullanan metot bulundukları alt-servise
  bütün taşındı (parçalanmadı); `dataSource` ilgili alt-servislere enjekte.
- ⚠️ ChatChannel/ChatParticipant/MatchAnnouncement/Notification `manager` üzerinden erişildiği için
  ekstra `@InjectRepository` gerekmedi.
- `reservations.module.ts`: 5 alt-servis providers'a eklendi; forFeature + ChatModule/NotificationsModule/
  SubscriptionModule import'ları korundu; forwardRef yok.

### Yöntem notu (sonraki chat split için de geçerli)
Büyük metotlar `sed -n 'START,ENDp'` ile byte-identical çıkarılıp yeni dosyaya eklendi; header
(import+constructor) kullanılan sembol grep'iyle (`grep -oE 'this\.[a-zA-Z]+'` + entity/typeorm token
taraması) belirlendi; helper çağrıları `perl -0pi -e 's/this\.X\(/this.dep.X(/g'` ile rewire edildi.
Her adımda build; sonda temiz-rebuild + `require(dist/app.module.js)`.

### Doğrulama
`npm run build` ✓ (exit 0) + `npm run lint` temiz (yalnız e2e parse). Temiz rebuild sonrası
`require('./dist/app.module.js')` OK (DI grafiği bütün). Deploy sonrası smoke-test: rezervasyon
oluştur/onayla/iptal, iptal-isteği/geri-al, saat teklifi/kabul, sürekli-kapatma oluştur/kaldır, manuel
doldur; Render log'unda 2 cron'un tek sefer çalıştığı teyit. Yalnız server; client değişmez.

### Sıradaki (ayrı task)
- **chat.service (1812)** bölme — 3/3, en zor (forwardRef döngüleri + cross-domain + transaction'sız
  çok-adımlı akışlar). Ertelenen T3 tip kalemleri.

---

## 24. Android klavye-kaçınma mimarisi + cihaz-bağımsız boşluk düzeltmesi (2026-07-02)

> Belirti: Android'de (Redmi 10S/MIUI) klavye açılınca input klavyenin üstünde fazla/eşit boşlukla
> kalıyordu; iOS sorunsuz. Daha önce düzeltilip Samsung S26 düzeltmesiyle tekrar bozulmuştu (flip-flop).

### Klavye mimarisi (client/, mobil — kalıcı bilgi)
- **Overlay model, JS-tabanlı boşluk:** `capacitor.config` `resize:'none'` + `AndroidManifest`
  `windowSoftInputMode="adjustNothing"` + `MainActivity setDecorFitsSystemWindows(true)` (non-edge-to-edge,
  opak koyu çubuklar) + **IME inset native'de tüketilir** (WebView klavye için ASLA resize olmaz). Klavye
  WebView'in üstüne biner; boşluk `paddingBottom: keyboardHeight` ile JS'te yönetilir.
- **`useKeyboardHeight()`** tek kaynak: tüm tüketiciler (Chat input, `KeyboardAwareModal`, maç-kur/joker
  notları, kayıt formları) bunu kullanır → tek noktadan düzelir. `KEYBOARD_GAP_PX=8` (klavyenin ~8px üstü).
- **`useKeyboardScroll()`** yalnız iOS (App.tsx'te mount). Android'de KAPALI — `scrollIntoView` WebView'i
  pan'leyip sabit başlık/footer'ı bozuyor.

### Kök neden + çözüm (§ commit d657cb9)
- **Capacitor `info.keyboardHeight` Android'de GÜVENİLMEZ:** nav-bar'ı dahil edip etmediği cihaz/sürüme
  göre değişir (edge-to-edge S26 ≠ non-edge-to-edge Redmi). Sabit formül iki cihazda birden doğru OLAMAZ →
  "nav-inset çıkar/çıkarma" düzeltmeleri sürekli birini bozar. **CİHAZ-ÖZEL FORMÜLLE FLIP-FLOP YAPMA.**
- **Doğru kaynak = gerçek geometri.** MainActivity inset listener'ında (IME'yi tüketmeden ÖNCE okuyarak):
  `overlap = max(0, webViewBottom − (windowHeight − imeBottom))` = WebView'in klavyeyle fiilen örtülen
  kısmı → `--android-keyboard-inset` CSS değişkenine yazılır (edge-to-edge/nav-bar/gesture fark etmez).
  `webViewBottom = getLocationInWindow + getHeight`, `windowHeight = decorView.getHeight()`.
- **`useKeyboardHeight` Android dalı:** `--android-keyboard-inset`'i `MutationObserver`(style) ile izler
  (+8px). iOS dalı: Capacitor `keyboardWillShow.info.keyboardHeight` (aynen). native+JS `cap sync` ile
  birlikte paketlenir → değişken hep mevcut.
- Korunanlar: `--android-nav-inset` yazımı, IME-inset tüketimi, koyu sistem çubukları, `KEYBOARD_GAP_PX=8`.

### ⚠️ Deploy/doğrulama notu
- Native (MainActivity.java) değiştiği için **yalnız web/OTA yetmez → yeni Android build** (Android Studio,
  `cap sync` yapıldı). iOS dokunulmadı.
- Cihaz testi ŞART, iki uçta: **Redmi 10S (MIUI, 3-tuş/gesture) + Samsung S26 (Android 15, gesture)** →
  chat + maç-kur notu + joker daveti notu; input klavyenin ~8px üstünde, fazla boşluk yok, composer klavye
  altında değil. Server tarafı yok; RevenueCat/Render ilgisiz.

---

## 25. Chat liste dokunma çakışması düzeltmesi + chat veri-yükleme ölçek raporu (2026-07-02)

> Belirti: Operasyon Merkezi (chat listesi) satırına dokununca bazen açılmıyor, anında "Seçenekler..."
> çıkıyor / kaydırırken options modalı tetikleniyordu.

### Mobil long-press deseni (KALICI kural — client/)
- **Doğru desen:** native `el.addEventListener('touchstart', …, {passive})` + `touchmove` ile **hareket
  eşiği (8px) iptali** + ~450ms timer + `touchcancel`; `touchend`'de hareketsiz/kısa dokunuş = **tap**.
  React'in **synthetic `onTouchStart`** ile YAPILMAZ: passive olduğu için `preventDefault` çalışmaz VE
  `onTouchMove` yoksa kaydırma long-press'i tetikler (eski ChannelItem hatası buydu).
- **Paylaşılan hook:** `client/pages/customer/Chat/hooks/useLongPress.ts` — `{ onTap, onLongPress,
  durationMs?, moveThreshold? }` alır, elemente bağlanan bir **ref döner** (onClick KULLANILMAZ; tap
  touchend/mouseup ile yakalanır). Mouse fallback dokunuştan türeyen olayları 700ms yok sayar. Long-press'te
  best-effort `navigator.vibrate(10)` (Android WebView titreşir, iOS no-op → **haptik için yeni native
  bağımlılık gerekmez**; `@capacitor/haptics` kurulu DEĞİL). ChannelItem bunu kullanır; MessageBubble hâlâ
  kendi native kopyasını kullanıyor (ileride hook'a taşınabilir).
- `MessageBubble.tsx` referans doğru-uygulamadır (450ms, 8px, passive:false+preventDefault — mesaj metni
  seçimini de engellediği için).

### Chat veri-yükleme ölçeklenebilirlik raporu (2026-07-02 tespiti)
- **Chat içi (mesajlar): ÖLÇEKLENEBİLİR ✓** — `getChannelMessages` cursor (`before`) + LIMIT(≤100) +
  composite index `[channelId,createdAt]`; client 50'lik yukarı infinite-scroll. **Unread:** tek GROUP BY ✓.
- **Kanal LİSTESİ: gelecekte darboğaz (henüz düzeltilmedi):** client `GET /chat/channels` **tümünü** çeker
  (sayfalama yok, 60sn poll + socket refetch). Server `getUserChannels`: son-mesaj/unread batched (iyi) ama
  kanal-başına rezervasyon/maç/takım + `getTeamPlayerCount` (user.teamId'de **index yok**) sorguları
  `Promise.all` içinde **N+1** → 100+ kanalda bağlantı havuzu tükenir. Real-time thread: her mesajda 50'lik
  sayfa tümüyle refetch (append değil).
- **Ayrı task (ertelendi):** kanal listesi client-pagination + server enrichment batching + `user.teamId`
  index + thread real-time append. (chat.service 1812-satır split 3/3 ile birlikte ele alınabilir.)
  → **§26'da server batching + index yapıldı** (client pagination + thread append hâlâ ertelendi; kullanıcı
  kararı: asıl darboğaz N+1'di, istemci sayfalama socket-refetch/pull-to-refresh riskini artırırdı).

## 26. Seçenekler modalı iOS hataları + getUserChannels N+1 batching (2026-07-02)

> Belirti: chat listesi basılı-tut "Seçenekler" modalı açılınca (1) başlık otomatik seçiliyor + Kopyala/Look Up
> callout'u çıkıyor, (2) alt navbar modalın üstünde görünüyor.

### iOS modal metin-seçimi / Kopyala callout'u (KALICI kural — client/)
- Full-screen modal iç kabına **`select-none`** sınıfı + inline **`{ WebkitUserSelect:'none', userSelect:'none',
  WebkitTouchCallout:'none' }`**. iOS long-press bitince parmak başlığın üzerindeyse WebKit metni seçip callout
  açar; bu stil engeller. (client'ta app-geneli user-select:none YOK — index.html `selection:` izinli varsayılan;
  ChannelItem `noCalloutStyle`'ı yalnız img'lere uyguluyordu.)
- **Modal açıkken navbar'ı gizlemek:** yeni z-index DEĞİL — her modal **`useModalBodyClass(isOpen)`**
  (`client/utils/useModalBodyClass.ts`) çağırmalı. Bu `body.modal-open` ekler; mevcut CSS
  (`index.css`) `body.modal-open nav/.business-navbar/.top-bell-safe { visibility:hidden; pointer-events:none }`
  + body scroll kilidi uygular. Hook **reference-counted** → aynı sayfada birden çok modal çağrısı çakışmaz
  (Chat.tsx artık hem `selectedChannelId` hem `optionsModalChannel` için çağırıyor). Options modalı bunu
  çağırmadığı için navbar görünür kalıyordu (kök neden). ConfirmModal/SuccessModal/KeyboardAwareModal zaten çağırıyor.

### getUserChannels N+1 → toplu sorgu deseni (KALICI kural — server/)
- **Kanal-başına DB sorgusu YASAK.** `getUserChannels` (chat.service.ts) MATCH_GROUP başına ~9 sorgu yapıyordu
  (50 kanal ≈ 273 sorgu). Desen: döngü öncesi distinct `relatedMatchId` topla → `In(matchIds)` ile rezervasyon +
  maç ilanı **tek sorgu** (maç ilanı tek sorgu fallback + `playerCount` + avatar teamId/matchType üçünü karşılar);
  eski-maç fallback rezervasyonu team+slot **in-memory eşleştirme**; oyuncu sayısı `getTeamPlayerCount ×N` yerine
  **tek GROUP BY** (`WHERE team_id = ANY($1)`); avatar takımları `In(teamIds)` tek sorgu. Döngü artık saf
  in-memory map; **dönüş şekli birebir korunmalı** (client/controller değişmesin).
- **Index'ler:** `user.team_id` (@Index) — GROUP BY + app-geneli `getTeamPlayerCount`; `chat_channels.lastActivityAt`
  (@Index) — liste `ORDER BY lastActivityAt DESC`. `synchronize:true` → server restart'ta otomatik oluşur.
- **ratingsService.getTeamPlayerCount** chat.service'te artık çağrılmıyor ama başka yerlerde kullanılıyor →
  bırakıldı (parameter property, TS "unused" saymaz; kaldırmak DI wiring'i riske atardı).

## 27. Sahalar sayfası ölçeklenebilirlik: konum-önce + sunucu sayfalama + N+1 temizliği (2026-07-02)

> Hedef: 50 işletme aynı anda yayın, ileride 400-500; müşteri Sahalar (PitchBooking) sayfası. Gerçek üst
> sınır: yarıçap sorgusu ~50-60 işletme (100km); saha başına ~30 bekleyen istek. 8-ajanlı read-only audit +
> adversarial review ile doğrulandı.

### Konum-önce geo liste deseni (KALICI — server/)
- **Bounding-box ÖN-filtre + Haversine kesin filtre:** geo listede (business.service.ts) Haversine `where`'inden
  ÖNCE `latitude/longitude BETWEEN` kutu filtresi (yarıçaptan hesap, **%10 güvenlik payı** ile çemberi kesin
  kapsa) → mevcut tekil lat/lng index'i kullanır, tüm-tablo trig taramasını bitirir. Kesin mesafe yine Haversine
  (sonuç birebir aynı). PostGIS gerekmez (işletme binleri bulursa yeniden değerlendir).
- **Sunucu offset sayfalama + STABİL ikincil anahtar:** `findNearbyPaged` konum-önce aday küme → sunucu-taraflı
  sıralama → `slice(offset, offset+limit)` → `{items,total,hasMore}`. **Eşit primary değerlerde MUTLAKA id ile
  tie-break** (`primary(a,b) || a.id.localeCompare(b.id)`) — `IN(...)` fetch sırası deterministik değildir; tie
  yoksa öğe sayfalar arası kayar/duplike olur (distanceKm 0.1'e yuvarlı + rating varsayılan 5.0 → eşitlik sık).
- **Paylaşılan endpoint dönüş şeklini GLOBAL değiştirme:** `getBusinesses` (array) MyTeam/Favoriler/
  CreateMatchModal'da kullanılıyor (biri `pitch.timeSlots` okuyor). Sayfalı `{items,...}` şekli için AYRI
  fonksiyon (`getBusinessesPaged`) + endpoint'te `limit` verilince sayfalı, yoksa legacy array. Legacy yol korunur.
- **QueryBuilder + eager:** entity `@OneToMany(..., { eager:true })` yalnız `find/findOne`'ı etkiler,
  `createQueryBuilder().getMany()`'yi ETKİLEMEZ (join açıkça yapılmalı). Yani liste QueryBuilder'da timeSlots
  JOIN'i yapılmadıkça gelmez — entity eager'ı kaldırmaya gerek yok (global regresyon riski alınmaz).
- **Karar:** timeSlots paginated payload'da KORUNDU (slot grid = booking çekirdeği senkron kalsın); asıl ölçek
  kazanımı sayfalama + bounding-box'tan. Lazy-timeSlots ileride (bounded ölçekte marjinal, flicker riski).

### İstemci sayfalama (KALICI — client/)
- Infinite-scroll (append) + sunucu sıralama (istemci JS sort kaldırıldı, sunucu sırası korunur). coords/radius/
  sort değişince sayfa 0'a reset. **B3 guard:** yuvarlanmış (lat,lng,radius,sort) anahtarı aynıysa arka plan
  konum tick'inde gereksiz tam yeniden çekim yok; pull-to-refresh `force` ile atlar.
- **Yarış guard'ı:** her reset bir `fetchGen` başlatır; await sonrası `gen !== current` ise yanıt uygulanmaz +
  bayraklar yalnız güncel nesilde temizlenir (sort mid-loadMore değişse eski sayfa yanlış sırada eklenmez /
  spinner takılı kalmaz).

### N+1 batching (owner paneli) + parity kuralı (KALICI — server/)
- Slot-başına DB sorgusu YASAK: `getDashboardSlots` saha başına **tek** `findByPitchAndDate(pitch.id, dayStart,
  dayEnd)` (İstanbul günü) + in-memory 60sn slot bucketing. Rezervasyon-başına ×4 rating → tüm teamId'ler
  toplanıp `getTeamMatchCounts` (teamId/opponentTeamId UNION GROUP BY) + `getTeamPlayerCounts` (user GROUP BY,
  user.teamId indexli). chat §26 In()+GROUP BY deseni.
- **Parity kritik:** batch'lerken AYNI repo metodunu kullan. `findByPitchAndDate` (captain'lar + matchAnnouncement
  relations + `status != CANCELLED`) ile `findByPitchAndDateRange` (bu relations YOK + tüm statüler) FARKLI →
  yanlışını seçmek sessiz regresyon. Gün-aralığı için per-slot ile aynı metodu (findByPitchAndDate) geniş
  aralıkla çağır → birebir davranış.
- **match_announcements** pitchId/teamId indexlendi; `findByPitch` team.players over-fetch'i kaldırıldı (kadro
  takım-detay modalında GET /teams/:id ile lazy — modal zaten kendi fetch'ini yapıyor).
- **TypeORM infra:** `extra: { max:20, statement_timeout:15000 }` (havuz tavanı + kaçak sorgu koruması).

### Sonraki (ayrı task)
- Maç Pazarı sayfası aynı prensiplerle. İleride (binlerce işletme) PostGIS/Redis + `synchronize:false`/migration.

## 28. Lottie animasyon altyapısı + Login/uygulama Round 1 (2026-07-02)

> Login'i ve uygulama genelini 4 Lottie animasyonuyla zenginleştirme (mevcut animasyon kütüphanesi yoktu,
> saf CSS). Format kararı: **Lottie JSON** (vektör, küçük, şeffaf, programatik). Kapsam parça parça.

### Lottie deseni (KALICI kural — client/)
- **Kütüphane:** `lottie-react` (lottie-web tabanlı). WASM'li dotlottie DEĞİL — eski MIUI/Redmi WebView'lerde
  güvenli render için (dvh yasağıyla aynı gerekçe: eski WebView uyumu).
- **Tek giriş noktası** `components/UI/LottiePlayer.tsx` (+ LottiePlayerInner): TÜM animasyonlar bundan geçer.
  - **React.lazy** → lottie-web YALNIZ bir animasyon gösterilince ayrı chunk olarak iner (build'de
    `LottiePlayerInner` ~318KB ayrı lazy chunk; ana/auth bundle şişmez). Doğrula: `npm run build` chunk listesi.
  - **JSON'lar `public/animations/`'tan runtime fetch** (`<Lottie animationData>`'ya verilir) → JSON'lar JS
    bundle'ına GİRMEZ. src = `/animations/<ad>.json`. Dosya adları temiz/kebab (boşluk/`!` URL'de sorunlu).
  - **prefers-reduced-motion** (index.css:140): dış LottiePlayer bunu ölçer, açıksa lottie chunk'ını HİÇ
    yüklemez → doğrudan `fallback`. Her kullanım anlamlı bir statik `fallback` vermeli (ikon/metin) — fetch
    hatası/yüklenme/reduce-motion hepsinde dikişsiz düşüş.
  - **Loop vs tek-sefer:** `loop` (dönen top/loader) sürekli; tek-sefer (success/kutlama) `loop={false}` +
    `onComplete` (yalnız loop=false'ta tetiklenir) ile aksiyon.
- **PageLoader (App.tsx) Lottie'ye ÇEVRİLMEZ:** o, ilk-açılış/Suspense fallback'i; Lottie lib'ini kritik açılış
  yoluna sokmak ters (loader'ın kendisi lib yüklenene dek gösterilemez). Mevcut CSS `dimliball` kalır.

### Round 1 kullanımlar
- SuccessModal: olumlu tiplerde (MATCH_APPROVED/CHALLENGE_ACCEPTED/MESSAGE_SENT) ball-success; yıkıcı tipler
  lucide kalır. Lottie kabı ile fallback ikon kabı AYNI boyut/margin (w-20 h-20, mb-6) → tip geçişinde kayma yok.
- TEAM_CREATED: TeamCreatedCelebration (World Cup + "{takım} takımını kurdun!", başlık yok) → onComplete→reload
  (Takımım). reduce-motion/hata'da onComplete oynamaz → **her zaman bir buton** olmalı (soft-lock önlemi).
- PitchBooking boş durum: football-pitch + "Belirlediğiniz konumda işletme bulunamadı" + "Arama alanını genişlet"
  → setIsLocationFilterOpen(true) (aksiyon alınabilir boş durum deseni).
- Login "GİRİŞ YAP": isSubmitting (çift-gönderim koruması) + dönen top loader; başarıda navigate ile unmount
  (isSubmitting sıfırlanmaz), hatada sıfırlanır.

### Sonraki (Round 2)
Diğer boş durumlar (JokerPool/Marketplace/ActiveMatches/Notifications/Favoriler → football-pitch), diğer
success tipleri, İşletme login loader, fullScreen LoadingSpinner overlay'leri.

### Round 2 (2026-07-02) — YAPILDI
- **fullScreen loader deseni:** paylaşılan `LoadingSpinner`/`BusinessLoadingSpinner`'ın YALNIZ `fullScreen`
  dalı dönen-top Lottie'ye çevrildi → tek nokta değişikliğiyle ~11 yükleme ekranı markalı (per-sayfa düzenleme
  yok). Küçük/inline (size sm) + PageLoader mevcut CSS ring'de kalır. Ball fallback = ring (boyut eşit: w-20 h-20).
- **İşletme login** müşteri login'in turuncu ikizi (isSubmitting + dönen top). 
- **Boş durum:** kullanıcı tercihi → animasyonu AZ/temalı kullan; yalnız FavoriteBusinesses (saha teması güçlü).
  Chat/Bildirimler'de mevcut anlamlı ikonlar (MessageCircle/Bell/Handshake) KORUNDU — jenerik sahayla değiştirme.
- **Not:** fullScreen loader'lar artık lottie chunk'ını yükleme ekranında çeker (ring fallback ile dikişsiz);
  ilk kullanımda chunk iner, sonra cache. Kabul edilebilir (chunk lazy + küçük anim 4KB).

## 29. Saat-dilimi (timezone) mimarisi + "rakip aranıyor" işletme panelinde neden görünmez (2026-07-02)

> Belirti (araştırıldı, kod hatası ÇIKMADI): müşteri 2 Tem 21:00'e "rakip aranıyor" açtı, işletme panelinde
> slot BOŞ. Kullanıcı timezone sandı. Read-only DB (Render) + kod ile incelendi.

### Kök neden — timezone DEĞİL, tasarım
- **rakip_araniyor ilanı PENDING iken rezervasyon OLUŞTURMAZ** (`match-announcements.service.ts` ~217:
  rezervasyon yalnız `kendi_aramizda`'da anında oluşur). rakip_araniyor için rezervasyon **ancak rakip kabul
  edince** (`challenges.service.ts` challenge-accept) oluşur → ilan CONFIRMED olur.
- İşletme paneli `business-owner.service.ts getDashboardSlots` slotları **yalnız rezervasyonlardan** doldurur
  (announcement'lara bakmaz) → rezervasyonsuz PENDING rakip_araniyor = panelde BOŞ. **Tasarım gereği**;
  kullanıcı kararı: böyle kalsın.
- DB kanıtı deseni: rakip_araniyor'ların çoğu (PENDING/EXPIRED) rezervasyonsuz; kendi_aramizda %100 rezervasyonlu.

### Timezone helper haritası (İstanbul UTC+3 sabit, DST yok) — hepsi DOĞRU
- `server/src/common/turkey-time.util.ts`: `istanbulDateTimeToUtc(date,time)` (date='YYYY-MM-DD', time='HH:mm')
  ve `istanbulNaiveStringToUtc('YYYY-MM-DDTHH:mm[:ss]')`. 21:00 İstanbul → 18:00 UTC.
- Rezervasyon slotTime'ı UTC saklanır (`timestamp without time zone` kolonu). Doğru yollar:
  kendi_aramizda + challenge-accept → `istanbulDateTimeToUtc`; işletme **manuel saat kapatma** (canlı DIRECT,
  `/reservations/manual-fill`) → controller `istanbulNaiveStringToUtc`. Panel eşleştirmesi de `istanbulDateTimeToUtc`
  + 60sn pencere. **Yeni rezervasyon/slot kodu yazarken slotTime'ı MUTLAKA bu helper'larla üret — asla ham
  `new Date(dateStr).setHours()` (tarayıcı-TZ) ile değil.**
- `ReservationModal.tsx` (tarayıcı-TZ ile hesaplıyordu) **ölü koddu → silindi** (§commit 67ceb84).

### Görüntüleme formatlaması düzeltmesi (2026-07-04) — `istanbulDisplayParts`
- **Bulunan hata:** `reservation-lifecycle.service.ts`'nin tamamı (rezervasyon isteği bildirimi, MATCH_REMINDER,
  "Maçınız Kesinleşti", saat çakışması, tüm iptal akışları — ~12 nokta) `slotTime`'ı (gerçek UTC an) **timeZone'suz**
  `toLocaleTimeString('tr-TR')` ile formatlıyordu → `main.ts` `TZ='UTC'` olduğundan **3 saat geri** gösteriyordu
  (DB kanıtı: 20:00 slotu bildirimi "17:00"). chat/challenges/match-announcements daha önce `timeZone:'Europe/Istanbul'`
  ile düzeltilmişti; lifecycle atlanmıştı.
- **Çözüm:** `turkey-time.util.ts`'e `istanbulDisplayParts(date)` eklendi → `{ dateStr'YYYY-MM-DD', time'HH:mm',
  dayName'Cumartesi', displayDate'4 Temmuz', displayDateWithYear }` (sabit +3 ofset, Intl'siz/deterministik).
  **Kullanıcıya gösterilecek her slotTime formatlaması BU helper'la yapılmalı** — asla çıplak `toLocale*`.
- **RESERVATION_REQUEST metadata v3:** create() + `findByOwner` self-heal artık `metaV:3`, `pitchId`, `slotDateIso`,
  `dayName`, `startTime/endTime` (İstanbul), `team{...}`, `opponentTeam{...}` (rakip_araniyor kabulünde iki takım;
  `toTeamMeta` projeksiyonu iki dosyada aynı — birlikte güncellenir), `matchType` yazar. Self-heal guard'ı
  `metadata.metaV !== 3` (eski/yanlış satırları bir kez onarır); rezervasyon silinmişse yalnız `metaV:3` işaretlenir.
  İstemci: bildirim detay modalındaki "Rezervasyon İsteğine Git" → dashboard `location.state{selectedDate, openSlot}`
  ile ilgili SlotDetailModal'ı otomatik açar (`useBusinessDashboard` tarih-guard'lı pending ref + PitchGrid `focusPitchId`).
- **Geçmiş slot yapısı (2026-07-04):** PitchGrid'de geçmiş slotlar artık TIKLANABİLİR; SlotDetailModal `isSlotPast`
  ile pasif moda geçer: boş → "Bu Saat Boş Geçti", APPROVED → "Oynandı" (aksiyonsuz), PENDING/EXPIRED → "Süresi
  Geçti" (Onayla/Not/Reddet gizli), kapatma/boşa-çıkarma butonları geçmişte render edilmez. Grid etiketi geçmiş
  FULL → "OYNANDI". Rozet adı: rakip_araniyor → **"Rakipli Maç"** (`matchTypeLabel`). Kaptan hızlı arama:
  `telHref` util'i `client/utils/phone.ts`'te (çıplak `tel:${...}` yazma). Tarih seçici sınırı −90/+30 gün
  (BusinessDateFilterModal — zaten vardı, alt başlık metni günceli yansıtır).

## 30. Customer sabit-başlık+elastic layout + başlık↔aksiyon çakışma deseni (2026-07-02)

- **Sabit başlık + elastic içerik (customer sayfa, navbar'lı):** `fixed inset-0 bg-pitch flex flex-col
  overflow-hidden` + `paddingTop: env(safe-area-inset-top)` → sabit header (`flex-shrink-0`) → içerik
  `flex-1 overflow-y-auto overscroll-contain scrollbar-hide` + `WebkitOverflowScrolling:'touch'` +
  `paddingBottom: calc(5rem + env(safe-area-inset-bottom))` (navbar). PitchBooking/JokerPool/işletme
  ayar sayfaları bu desende. TeamProfile bu desene taşındı (tab switcher artık sabit, içerik elastic).
- **Nested içerik sayfaları** (UserProfile/MyTeam gibi, sadece bir parent'ta kullanılan) içerik-only
  olmalı (`min-h-full`, kendi scroll'u/`fixed`i YOK) → dış scroll kabında sorunsuz. Notch padding'i
  parent (outer safe-area) hallettiğinde child'da `pt-page-top` KULLANMA (çift-notch) → `pt-3`.
- **Global bell** `/team`, `/chat`, `/jokers`'ta gizli (Navbar.tsx:89) — bu sayfalarda header üst-boşluğu
  için bell yeri ayırma.
- **Başlık ↔ sağ-üst aksiyon çakışması:** `fixed right-4` buton + `whitespace-nowrap` uzun başlık dar
  ekranda çakışır. Çözüm: `flex items-start justify-between gap-3` satırı — başlık `min-w-0 flex-1` (wrap
  serbest, clamp font), buton `flex-shrink-0` (flow'a al). Buton yeri otomatik ayrılır → çakışma imkânsız,
  responsive. (JokerPool başlığı bu şekilde düzeltildi.)
- **Reload sonrası tab state:** reload state'i sıfırlar; kalıcı seçim için `sessionStorage` bayrağı set
  et + hedef component init'te oku+temizle (TeamCreated → TeamProfile TAKIMIM tab deseni).

---

## 31. Uyruk (nationality) — dinamik ülke bayrağı: kayıt + hesap ayarları + DB (2026-07-02)

Oyuncu kartındaki bayrak eskiden **hardcoded** Türk bayrağıydı (`<img src=flagcdn.com/w40/tr.png>`,
PlayerDetailModal + JokerDetailModal). Dinamik hâle getirildi.

- **Veri modeli:** `user.nationality` = **ISO 3166-1 alpha-2 kod, uppercase** (örn. `'TR'`). Entity
  `@Column({ default: 'TR' })` → `synchronize` deploy'da sütunu `NOT NULL DEFAULT 'TR'` oluşturur,
  **mevcut satırlar otomatik 'TR' (backfill)**. Manuel ALTER **yapılmadı** (agent.md §9: canlı DB'ye yazma yok).
  DTO'larda `nationality?: string` **optional** (server geri-uyumlu; zorunluluk client UI'da) —
  `create-user.dto` + `update-user.dto`. Service/controller değişmedi (`...userData` spread + `update` +
  `GET /users/me`/roster/joker yanıtları alanı otomatik taşır).
- **Bayrak = gömülü/offline (KALICI karar):** `flag-icons` paketi. CSS bir kez `index.tsx`'te import
  (`flag-icons/css/flag-icons.min.css`). Vite bayrakları CSS içine **data:image/svg (inline)** + büyükleri
  ayrı SVG olarak gömer → **internet gerektirmez** (flagcdn kaldırıldı). Render: `components/UI/Flag.tsx`
  → `<span className="fi fi-{code.toLowerCase()}" style={{width:1.5rem,height:1rem,backgroundSize:cover}}>`.
- **Ülke listesi:** `client/data/countries.ts` — tam ISO listesi (~195), **Türkçe** adlar, Türkiye ilk.
  `getCountryName(code)`, `getCountry(code)`, `DEFAULT_NATIONALITY='TR'`.
- **Seçici:** `components/UI/CountryPickerModal.tsx` — LocationSelectionModal deseni (`KeyboardAwareModal`
  + arama header + kaydırılır liste, `z-[100]`). Satır: `Flag` + Türkçe ad + seçili tik. Türkçe arama
  (`toLocaleLowerCase('tr')`).
- **Kayıt:** `useRegister` formData default `nationality:'TR'` (payload'a `...rest` ile gider);
  `PlayerProfileStep` Mevki/Ayak yanına "Uyruk" satırı → CountryPickerModal. Default TR, boş olamaz.
- **Hesap ayarları:** `useProfile` profileData'ya `nationality` (yükle `GET /me`, kaydet PATCH payload);
  `ProfileSettings` "Oyuncu Bilgileri" bölümünde "Uyruk" picker satırı.
- **Bayrak gösterimi (dinamik):** PlayerDetailModal + JokerDetailModal → `<Flag code={player.nationality || 'TR'} />`.
- **⚠️ Deploy notu:** Sütun **server deploy/restart'ında** oluşur (synchronize). Deploy sonrası salt-okunur
  doğrulama: `SELECT nationality, count(*) FROM "user" GROUP BY 1;` (15 = TR beklenir). Client yeni native build ister.

---

## 32. Kullanıcıya-dönük hata mesajları HEP Türkçe (2026-07-03)

Kullanıcı İngilizce/ham backend uyarıları görmemeli (ör. satın almada "purchase was cancelled",
her yerde jenerik "Internal server error"). Kalıcı kurallar:

- **Server — düz `throw new Error('...')` KULLANMA** kullanıcıya-dönük koşullarda. Uygun HttpException +
  **Türkçe** mesaj at: `NotFoundException`/`ConflictException`/`ForbiddenException`/`BadRequestException`.
  Düz `Error` NestJS'te **500 "Internal server error"**e döner ve mesaj gizlenir (Türkçe olsa bile). Yalnız
  gerçekten-içsel invariant'lar (config, "unique shortId üretilemedi" gibi) düz `Error` kalabilir.
- **Global filtre:** `server/src/common/all-exceptions.filter.ts` (`main.ts`'te `useGlobalFilters`) →
  HttpException'lar (Türkçe mesajlar) geçer; yakalanmamış hatalar **Türkçe** genel mesaja düşer
  (`'Sunucu hatası. Lütfen daha sonra tekrar deneyin.'`), stack/İngilizce metin **istemciye sızmaz**.
  Yeni catch bloklarında ham `err.message`/`err.stack` döndürme (teams create'te bu düzeltildi).
- **Client — RevenueCat/satın alma hataları:** `revenuecatService.purchaseErrorToTurkish(err)` kullan
  (`{cancelled, message}`). Ham SDK `err.message` (İngilizce) ASLA gösterilme; **iptalde sessiz geç**.
  `useBusinessSubscriptionSettings` + `useBusinessRegister` bunu kullanır.
- **Client backend hataları:** `getErrorMessage(err, fallback)` (`utils/apiError.ts`) — jenerik İngilizce
  ('internal server error'/'not found'...) gelirse Türkçe fallback'e düşer; artık server zaten Türkçe döner.
- **Not:** Kalan içsel düz-Error listesi (chat 'Failed to create message', business 'findAll requires...',
  teams 'unique shortId'/'after update', sms/firebase/jwt config) global filtre ile Türkçe jenerik'e döner.

---

## 33. GPS konum yönetimi merkezileştirme + ÜCRETSİZ offline il/ilçe türetme (2026-07-03)

> Sorun: konum her sayfada farklı davranıyordu (Sahalar güncelleniyor, Joker'de eski konum);
> ilçe bayat kalıyordu ("Beşiktaş"). Eski yapı: 2 paralel GPS sistemi (LocationContext coords +
> App.tsx gecikmeli poll) + 3 kopuk PATCH noktası, ilçe **ham Nominatim** ile (mobilde sık başarısız).

### Maliyet kararı (KALICI): kullanıcı ilçesi = SUNUCU-TARAFI OFFLINE, geocoder ÜCRETİ YOK
- Google Geocoding kullanıcı tarafında 10-20bin kullanıcıda ~$850–$9.000/ay (aylık ilk 10k ücretsiz,
  sonrası ~$5/1000; $200 evrensel kredi Mart 2025'te kaldırıldı). Sadece **il/ilçe** gerektiği için
  (açık adres değil) ücretli geocoder'a gerek YOK.
- **İşletme tarafı Google'da KALIR** (`services/locationService.ts` reverseGeocode + `@vis.gl/react-google-maps`
  haritası) — hacim küçük (birkaç kayıt), ücretsiz eşikte. Kullanıcı tarafı Google/Nominatim ARTIK YOK.

### Sunucu — offline point-in-polygon (`server/src/geo/`)
- **`ReverseGeocodeService`** (`reverse-geocode.service.ts`): boot'ta `turkey-districts.geojson`'u belleğe
  yükler (974 ilçe poligonu, OSM admin_level=6, **ODbL** — atıf gerekir), her feature için bbox precompute.
  `lookup(lat,lng) → {province, district} | null`: bbox ön-filtre + `@turf/boolean-point-in-polygon`.
  ~mikrosaniye; **çağrı başına $0, sınırsız ölçek, offline**. Türkiye dışı/deniz/geçersiz → null.
- **Veri seti**: `izzetkalic/geojsons-of-turkey` (git-lfs 45MB) → node ile temizlendi (Point'ler atıldı,
  çeviri props'ları çıkarıldı, il plaka kodundan türetildi, 5 ondalık) → **11MB** `src/geo/turkey-districts.geojson`.
  ⚠️ OSM yazımı: **"Kağıthane"** (şapkasız). Coğrafi sadeleştirme YAPILMADI (sınır doğruluğu korunsun).
- **`nest-cli.json` `assets: ["geo/*.geojson"]`** → build'de `dist/geo/`'ya kopyalanır; servis `__dirname`
  ile okur (dev src/geo, prod dist/geo, jest src/geo — hepsi çalışır).
- **`UsersService.update`**: `latitude/longitude` gelince `reverseGeocode.lookup` → `dto.location = district`
  (SUNUCU yetkili kaynak). Eşleşme yoksa location'a dokunma (son bilinen korunur). Server şeması değişmez
  (`user.location` tek alan; district/city kolonu YOK). Test: `reverse-geocode.service.spec.ts` (Beşiktaş/
  Kağıthane/Kadıköy/Çankaya/Konak + yurt dışı null).

### Client — LocationContext TEK OTORİTE (harici geocoder YOK)
- `contexts/LocationContext.tsx` artık coords + ilçe + sunucu senkronunun tek yeri. Client **hiç** geocoder
  çağırmaz: sadece `PATCH /users/me {latitude,longitude}` atar, ilçeyi **yanıttaki `location`'dan** okur →
  yeni `locationName` (uygulama geneli tek değer, `LOCNAME_CACHE_KEY` ile soğuk-açılış cache'i).
- **Tek senkron fonksiyonu `syncLocationToServer(c,{force})`**: `getToken()` yoksa çık, `syncInFlightRef`
  çift-uçuş engeli, **>250m kapısı** (`calculateDistance`; force atlar). İlk giriş: coords ilk geldiğinde
  `lastSyncedCoordsRef` null → kapı atlanmaz → tek PATCH (ayrı first-entry effect'e gerek yok).
- Efektler: `[coords,isCustomer]` → sync; **interval** (iOS 3dk/Android 2dk) → `requestLocation(false)` (coords
  değişirse coords-effect senkronlar); logout'ta `lastSyncedCoordsRef` reset. **Yalnız `isCustomer`** (işletme
  hesabında koşmaz). `refreshLocation()` = manuel tam tazeleme (force). `coordsRef` bayat-closure önlemi.
- **Provider sırası DEĞİŞTİ** (`App.tsx`): `AuthProvider > SocketProvider > LocationProvider > FilterProvider`
  (LocationContext'in `useAuth()` okuması için — CLAUDE.md sırası). 
- **App.tsx**: tüm GPS poll/interval/Nominatim/foreground-konum SİLİNDİ (push/presence/ratings/badge KORUNDU).
  `useJokerPool` coords-PATCH'i SİLİNDİ. `useUserProfile.handleUpdateLocation` → `refreshLocation()` + re-fetch
  (izin-reddi ön-kontrolü kaldı); `ProfileHeaderCard` `liveLocation ?? currentUser.location` gösterir.

### Doğrulama
Sunucu `npm run build` ✓ + asset dist'e kopyalandı + jest spec ✓ (derlenmiş dist servisi 974 poligon, 2ms).
Client `vite build` ✓ + `tsc --noEmit` (yalnız önceden var olan `LocationStep` window.google) + `npx cap copy` ✓
(iOS `pod install` yerel CocoaPods/Ruby 3.4 unicode bug'ı — kod dışı, native değişiklik yok). **Deploy:** server
Render'a (GeoModule), client **yeni native sürüm** ister. Cihaz testi: soğuk açılış→Joker doğru ilçe+mesafe;
Profil canlı ilçe; Sahalar/maç pazarı tutarlı; 2-3dk tazeleme; izin-reddi; hesap değişimi.

> **Not (2026-07-03):** Kullanıcı ilçe yazımındaki şapka farkını ("Kâğıthane" eski Nominatim verisi vs
> OSM "Kağıthane") normalize etme fikrinden **vazgeçti** — mevcut haliyle kalacak, dokunma.

---

## 34. Joker daveti kartı + Joker DM durum/detay zenginleştirme (2026-07-03)

> Joker davet bildirimi kartı zayıftı (yalnız takım/tarih/saha adı) ve joker DM'i chat listesinde
> maçın rezervasyon durumunu ("Onay Bekliyor") gösterip jokeri yanıltıyordu.

- **Server `sendJokerInvite` metadata genişledi** (`notifications.service.ts`): + `pitchPrice, playerCount,
  matchType, businessDistrict, businessAddress, businessLat, businessLng` (match zaten `pitch.business`
  ilişkileriyle yüklü — ek sorgu yok). Eski bildirimlerde bu alanlar yok → client alan yoksa satırı gizler.
- **Server `getChannelMatchDetails`** (`chat.service.ts`): `pitch.business`'a + `district, latitude, longitude`
  (canlı endpoint — eski joker kanalları da otomatik zenginleşir, backfill gerekmez).
- **Client joker daveti kartı** (`Notifications/components/MatchRequestsTab.tsx`): yeniden tasarım — üstte
  takım+tarih(+N Kişilik), altında bilgi paneli: saha satırı + **uzaklık rozeti** (`useLocationContext().coords`
  + `calculateDistance` → "X km"), konum satırı (ilçe kalın + adres), **₺ücret/saat** satırı, maç tipi satırı.
  `MATCH_TYPE_LABELS` map'i (kendi_aramizda/rakip_araniyor).
- **Client chat listesi** (`Chat/components/ChannelItem.tsx`): JOKER_NEGOTIATION'da `statusInfo = null` →
  rezervasyon durum etiketi ve `MatchStatusBadge` GÖSTERİLMEZ; yerine sabit sarı **"Müzakere Odası"** (+Star,
  Chat.tsx başlık stiliyle aynı). Maçın gerçek durumu artık yalnız Sohbet Detayları'nda.
- **Client `JokerDMChatInfoModal`**: İLGİLİ MAÇ başına **maç durumu chip'i** (`getMatchStatusInfo(reservation)`
  yeniden kullanıldı: Onay Bekliyor/Kesinleşti/Oynanmış/Oynanmamış + kısa açıklama; pending'de pulse) + saha
  satırına ilçe/adres + uzaklık rozeti + **saha ücreti** satırı. `useLocationContext` hook'u erken-return'den
  ÖNCE çağrılır (hooks kuralı).
- Doğrulama: server build ✓; client `tsc` (yalnız LocationStep) + build + `cap copy` ✓. Deploy sonrası yeni
  JOKER_INVITE metadata'sı DB'de salt-okunur SELECT ile doğrulanabilir (bağlantı dizesi repoda TUTULMAZ, §9).
- **Ek (aynı gün):** maç saati her iki yüzeyde **aralık** gösterilir ("23:00 - 00:00"; maç süresi uygulama
  geneli 1 saat — kart `addOneHour` HH:MM helper'ı, modal slotTime+1h). Sahalar **Yol Tarifi onay modalı**
  `z-50 → z-[90]` + `createPortal(document.body)` (aşağıdaki §35 kuralı).

---

## 35. KALICI KURAL: Modal overlay'ler `createPortal(document.body)` ile render edilir (2026-07-03)

> Belirti: TeamProfile'da (PROFİLİM/TAKIMIM) açılan modallar sekme barının ALTINDA kalıyor, backdrop
> üst şeride (safe-area + bar) hiç boyanamıyordu; bar modal başlıklarını kesiyordu.

**Kök neden:** TeamProfile layout'u = root `fixed inset-0` + içte `overflow-y-auto` +
`WebkitOverflowScrolling:'touch'` scroll konteyneri (§30 elastic desen). iOS WebKit'te bu konteyner
kendi compositing/containing bağlamını yaratır → **içindeki `fixed inset-0` modallar viewport'a değil
konteynere hapsolur** (backdrop üst şeridi kaplayamaz; z-index kaç olursa olsun kurtarmaz). Eski
`.team-profile-tabs::after` karartma katmanı bu sorunun MASKESİydi (ayrıca ::after çocuk kutunun
altında boyandığından butonları karartmıyordu bile) — kaldırıldı.

**Çözüm/kural:** `fixed inset-0` overlay döndüren HER modal bileşeni JSX'ini
**`createPortal(<overlay/>, document.body)`** ile sarar (TeamDetailModal deseni). `KeyboardAwareModal`
kullananlar **`portalToBody`** prop'unu geçer. Yeni modal yazarken de bu kural geçerli — sayfa
ağacının derinliğinde `fixed` overlay bırakma.

**Bu turda portal'lanan dosyalar:** SuccessModal, ConfirmModal, MatchHistoryModal,
UpcomingMatchesModal, CreateMatchModal, CreateTeamModal, PlayerDetailModal, LocationPermissionSheet,
TeamSettingsMenu, ProfileSettingsMenu, MyTeam.tsx inline playerActions sheet, JoinTeamModal
(portalToBody), PitchSchedule Yol Tarifi modalı. (Zaten portal'lı: TeamDetailModal,
ActiveMatchesList, ImageCropModal, FacilitiesModal, TimeSlotsModal, TeamCreatedCelebration.)

**UX kararı:** PROFİLİM/TAKIMIM barı modal açıkken GİZLENMEZ ve ekstra karartılmaz — portal sayesinde
backdrop tüm ekranı kapladığından bar diğer arka plan içeriği gibi doğal karartılır/blurlanır
(kullanıcı tercihi). index.css'teki `.team-profile-tabs` modal-open kuralları tamamen kaldırıldı;
`body.modal-open nav … { visibility:hidden }` navbar kuralı ise app-genel mevcut davranış olarak DURUYOR.

Doğrulama: `tsc --noEmit` (yalnız önceden var olan LocationStep) + `vite build` + `cap copy` ✓.

---

## 36. Maç Pazarı anlık ilan + meydan okuma/detay kartları zenginleştirme (2026-07-03)

> İki iş: (1) ilan yayınlanınca Maç Pazarı'na anlık düşmüyordu, (2) meydan okuma bildirim kartı +
> maç detay modalları + ChallengeModal joker daveti kartı (§34) kalitesine çıkarıldı. **Yalnız client
> — sunucu DEĞİŞMEDİ** (tüm veri zaten payload'daydı).

### Maç Pazarı anlık ilan (kök neden + desen)
- **Kök neden:** Marketplace `/` rotasında mount'luyken CreateMatchModal POST sonrası yalnız
  `onClose()` + `navigate('/')` yapıyordu → hiçbir refetch tetiklenmez, `matches` bayat. (PitchBooking/
  MyTeam'den açılınca route remount taze fetch getirdiği için sorun YALNIZ pazar-içi oluşturmadaydı.)
- **Fix:** `useMarketplace`'e `refetch()` (offset=0 + fetch); CreateMatchModal'a **opsiyonel**
  `onCreated?: ({date}) => void` (yalnız başarılı `rakip_araniyor` dalında, navigate'ten önce);
  Marketplace `onCreated`'da **tarih filtresini ilan tarihine hizalar** (`setSelectedDate(date)`) +
  `refetch()`. ⚠️ FilterContext `selectedDate` default'u BUGÜN ve boş hali yok — hizalama yapılmazsa
  farklı tarihe açılan ilan refetch'e rağmen görünmez (tuzak).
- Socket ile diğer kullanıcılara anlık yayın bilinçli KAPSAM DIŞI (kullanıcı kararı).

### Meydan okuma bildirim kartı (MAÇ İSTEKLERİ)
- `GET /challenges/team/:id/incoming` (`findIncomingByTeamId`) zaten `fromTeam` + `match.pitch.business`
  join'liyor → kart zenginleştirmesi için **sunucu değişikliği GEREKMEZ** (joker kartının aksine —
  o notification metadata'sından beslenir, bu Challenge entity'den).
- `MatchRequestsTab.tsx` challenge kartı joker kartı düzenine geçti: LevelBadge + FairPlayScore
  (`fairPlayScore != null` guard — komponent `.toFixed` çağırır), saat aralığı, bilgi paneli
  (saha+uzaklık rozeti / ilçe+adres / ₺ücret / N Kişilik·tip). `types.ts MatchAnnouncement`'a
  `matchType?/distanceKm?` eklendi → `(match as any)` cast'leri kalktı.

### Paylaşılan yardımcılar (yeni — tekrar kullan)
- **`client/utils/time.ts` `addOneHour(hhmm)`** — HH:MM +1 saat (maç süresi app-geneli 1 saat).
  Tüketiciler: MatchRequestsTab, MatchDetailModal, KendiAramizdaMatchModal, ChallengeModal.
  (JokerDMChatInfoModal slotTime-Date aritmetiği ve MatchAnnouncementCard/CreateMatchModal'ın
  timeSlot-bilinçli end-time varyantları AYRI semantik — birleştirme.)
- **`client/components/Modals/DirectionsConfirmModal.tsx`** — Yol Tarifi onay modalı + `openDirectionsUrl`
  (iOS `maps://?daddr=`, Android Google Maps URL, `_system`). Kendini `createPortal(document.body)` +
  `z-[90]`'a basar (§35). PitchSchedule buna refactor edildi; MatchDetailModal + KendiAramizdaMatchModal
  de kullanıyor. Yeni "yol tarifi" yüzeyi eklerken BUNU kullan.

### Maç detay modalları (MatchDetailModal + KendiAramizdaMatchModal — ikiz dosyalar)
- Saat "Maç saati 21:00 - 22:00" aralığı; saha satırına uzaklık rozeti (`useLocationContext` +
  `calculateDistance`); yeni ilçe+adres satırı; Yol Tarifi butonu. Hook'lar (`useLocationContext`,
  `useState`) `if (!isOpen) return null`'dan ÖNCE (hooks kuralı). İkisi de artık §35 uyumlu
  (`createPortal(document.body)`).
- **Bug fix:** "Sahayı Ara" butonu ölü koddu — server match-details `ownerPhone` döndürür, client
  `business.phone` bekliyordu. Koşul/href `phone || ownerPhone` yapıldı → buton canlandı.
  ⚠️ `getChannelMatchDetails` alan adı `ownerPhone` — yeni tüketicilerde `phone` varsayma.
- ChallengeModal: saat aralığı + Format (`7v7`) + Uzaklık hücreleri (`selectedMatch.distanceKm/
  playerCount` Marketplace'ten prop'la gelir — sunucu zaten hesaplıyor) + `portalToBody` (§35).

### Doğrulama
Client `tsc --noEmit` (yalnız önceden var olan LocationStep) + `vite build` ✓. Canlı DB salt-okunur
teyit: son 5 challenge'ta level/fairPlay/saat/kişi/tip/saha/ücret/ilçe/adres/koordinat HEPSİ dolu.
Cihaz testi: pazar-içi ilan → anında listede; bildirim kartı zengin; detay modallarında aralık/konum/
uzaklık/Yol Tarifi/Sahayı Ara; Meydan Oku modalı zengin. Client değişikliği → **yeni native sürüm** ister.

---

## 37. Kullanıcı Giriş/Kayıt revizyonu — tam sayfa sihirbaz + kutlama ekranı (2026-07-03)

> Kayıt/Şifremi Unuttum "yarım modal" (ortada yüzen max-w-md kart) görünümündeydi; adım geçişi
> animasyonsuz, kayıt başarısında kutlama yoktu; `animate-shake` sınıfı TANIMSIZDI (hiç çalışmamış).
> İşletme auth akışına DOKUNULMADI.

- **`components/Layout/AuthWizardLayout.tsx` (YENİ):** müşteri auth sihirbazlarının ortak TAM SAYFA
  kabuğu (Login'in fixed + negatif safe-area + gradient reçetesi). Üst: geri oku (44px) + logo +
  `{step}/{total}` sayacı + progress bar + adım başlığı. Orta: TEK scroll konteyner (klavye kuralı).
  Alt: akış-içi footer — `paddingBottom: keyboardHeight || max(12px, env(safe-area-inset-bottom))`
  (capacitor `resize:'none'` → buton klavye üstünde durur). Adım içeriği `key={step}` +
  `.animate-step-in` (kurumsal-sade geçişin TEK kaynağı — adım köküne ayrıca animasyon KOYMA).
- **`components/UI/CelebrationScreen.tsx` (YENİ):** genel tam-ekran kutlama (portal + z-[9999],
  opak gradient zemin, Lottie `src` prop'la değiştirilebilir, `autoCloseMs` timer'ı animasyondan
  bağımsız → reduce-motion güvenli). Kayıt başarısı ("HOŞ GELDİN {AD}!", world-cup.json, 3.2sn →
  `/` replace) ve Şifremi Unuttum başarısı (ball-success.json, 2.2sn → `/login` replace) kullanır.
- **Register:** kart kalktı; 7 adım AuthWizardLayout üzerinde; `<form>` kaldırıldı (İleri/Tamamla
  footer butonu); EULA işaretlenmeden "Kaydı Tamamla" görünür-disabled; `useRegister.handleRegister`
  argümansız, sonda `navigate('/')` yerine `registerSuccess=true`. RegisterHeader/RegisterActions/
  AccountStep/PersonalInfoStep (ölü) SİLİNDİ. Input reçetesi Login'le birleşti
  (`bg-slate-800/40 border-slate-700/80 rounded-2xl focus:shadow-neon-sm`).
- **ForgotPassword:** aynı layout (3 adım); "Farklı numara gir" artık `window.location.reload()`
  değil `goBackToPhone()` (telefon dolu kalır, countdown sürer — SMS spam önlenir).
- **§35 uyumu (yük taşıyıcı ön koşul):** BirthDatePickerModal + PositionPickerModal
  `createPortal(document.body)`'ye alındı (z-[90]); CountryPickerModal'a `portalToBody` verildi —
  aksi halde fixed sihirbaz içinde iOS'ta hapsolurlardı.
- **index.css:** `stepIn` (0.32s, 10px yükselme) + `shake` keyframe'leri eklendi (reduce-motion
  fallback'li). `animate-shake` bug'ı böylece kapandı; Login hata bandına da `key={errorNonce}` ile
  bağlandı (art arda hatada yeniden titrer).
- **Özel Lottie yuvaları** (kullanıcı animasyon bulunca tek `src` sabiti değişir):
  (a) `REGISTER_SUCCESS_LOTTIE` (Register.tsx), (b) OTP adımı aksanı, (c) foto adımı kamera,
  (d) ilk adım karşılama, (e) `RESET_SUCCESS_LOTTIE` (ForgotPassword.tsx — kilit açılma temalı).
- Doğrulama: `tsc --noEmit` (yalnız önceden var olan LocationStep) + `vite build` + `cap copy` ✓.
  Client değişikliği → **yeni native sürüm** ister.

---

## 38. Takım silme düzeltmesi + sihirbaz üst boşluk + kutlama davranışı (2026-07-03)

> "Mavi şimşekler" vakası: geçmiş tarihli ama statüsü CONFIRMED/PENDING kalan kayıtlar takım
> silmeyi engelliyordu; kaptan hesabı silinince takım captainId=NULL ile ÖKSÜZ kalıp artık hiç
> silinemez hale geliyordu. Canlı DB'de kullanıcı onayıyla tek seferlik temizlik yapıldı (takım +
> 3 challenge + 5 ilan silindi, 7 rezervasyonun takım bağı NULL'landı; başka öksüz takım yok).

- **`teams.service.ts deleteTeam`:** engel kontrolleri artık TARİH-BİLİNÇLİ — yalnız GELECEK maçlar
  engeller (ilan `date >= bugün`, rezervasyon `slotTime > now`; UTC/TR gün sınırında ~3 saat geç
  serbest bırakma toleransı bilinçli). Silme öncesi **`purgeTeam(teamId)`** (guard'sız, tek
  transaction): challenges + join_requests + TÜM match_announcements DELETE; reservation
  teamId/opponentTeamId **NULL** (işletme rezervasyon geçmişi KORUNUR); üyeler team_id NULL; team
  DELETE. QueryFailedError → Türkçe 400 (500 sızmaz).
- **FK envanteri (takım):** challenges.fromTeamId, join_requests.teamId, match_announcements.team_id,
  reservation.teamId/opponentTeamId, user.team_id — CASCADE YOK; yalnız team_bans CASCADE'li.
  Yeni takım-bağlı tablo eklerken purgeTeam'e (ve users.service purgeTeamRaw'a) da ekle!
- **`users.service.ts deleteAccount`:** kaptan silinirken devredilecek kimse yoksa (tek kişilik
  takım) takım artık öksüz bırakılmaz — `purgeTeamRaw` (purgeTeam ile aynı SQL sırası; dairesel
  modül bağımlılığı kurmamak için raw kopya — İKİSİ SENKRON TUTULMALI) ile takım da silinir.
- **Client:** `AuthWizardLayout` header üst padding `clamp(20px,3.5vh,32px)` (min 10→20px — status
  bar çakışması bitti). Register kutlamasında `autoCloseMs` KALDIRILDI: animasyon BAŞLA'ya basılana
  dek döner, otomatik geçiş yok (kullanıcı kararı). ForgotPassword'daki 2.2sn otomatik geçiş kalır.
- Doğrulama: server build ✓; client tsc (yalnız LocationStep) + build + cap copy ✓. Deploy: server
  Render'a; client yeni native sürüm ister.

---

## 39. Silinmiş takıma fair-play değerlendirmesi — "Bu takım artık mevcut değil" (2026-07-03)

> Senaryo: iki takım maç yapar, rakip fair-play skoru verecek; bu sırada takım silinir. Silme
> ENGELLENMEMELİ (zaten engellemiyor — ratings.targetTeamId FK değil), ama rakip artık skor
> VEREMEMELİ ve "bu takım artık mevcut değil" diye bilgilendirilmeli.

- **Kök sorun:** hard-delete FK yüzünden `reservation.teamId/opponentTeamId` NULL'lanınca rakibin
  KİM olduğu kaybolur. Eski `getPendingRatings/getMatchHistory` `needsFairPlayRating=true` +
  `opponentTeamName=null` döndürüp maçı "Kendi Aramızda" gösteriyordu (yanlış); `submitRating`
  silinmiş takıma öksüz rating kaydediyordu.
- **Çözüm (hard-delete korunur — soft-delete DEĞİL, kullanıcı kararı):**
  - `reservation.deletedTeamName` (nullable varchar) eklendi. `purgeTeam`/`purgeTeamRaw` NULL'lamadan
    ÖNCE silinen takımın adını bu maçlara snapshot'lar + `DELETE FROM ratings WHERE targetTeamId=id`
    (takımın aldığı fair-play öksüzlerini temizler). **purgeTeam(teamId, teamName) imzası — iki ikiz
    (teams.service + users.service purgeTeamRaw) SENKRON TUTULMALI.**
  - `ratings.service.resolveOpponent(reservation, userTeamId)` ortak helper'ı: rakip = kullanıcının
    takımı OLMAYAN taraf; o tarafın canlı ref'i yoksa `opponentTeamDeleted=true` + snapshot ad
    (`deletedTeamName ?? 'Silinmiş takım'`). Snapshot sayesinde HER İKİ silme durumu (ev sahibi/
    deplasman) tespit edilir. Silinmiş rakipte `needsFairPlayRating=false`. `team` relation'ı
    getPending/getMatchHistory sorgularına eklendi (ekstra findOne kalktı).
  - `submitRating`: FAIRPLAY'de hedef takım yoksa `NotFoundException('Bu takım artık mevcut değil.')`
    (kayıttan ÖNCE) — bayat client submit'i temiz reddedilir.
  - Client: `PendingRating`/`MatchHistoryItem`'a `opponentTeamDeleted`. MatchHistoryModal "vs {ad}"
    + "Bu takım artık mevcut değil" notu; RatingModal/App.tsx zaten `opponentTeamId` guard'lı (null →
    fair-play POST atılmaz), 404 sessiz yutulur.
- **Canlı DB:** `reservation.deletedTeamName` kolonu ALTER ile eklendi (deploy'da synchronize uzlaşır)
  + öksüz rezervasyon `7d91d44a` (Konyalılar vs silinmiş Mavi şimşekler) backfill'lendi → boş-isimli
  modal bug'ı gerçek adla düzeldi. Öksüz fair-play rating = 0.
- Doğrulama: server build ✓; client tsc (yalnız LocationStep) + build + cap copy ✓. Deploy: server
  Render'a (synchronize kolonu ekler); client yeni native sürüm.

---

## 40. KALICI KURAL: `turf` rengi TAM skala tanımlı olmalı (renk sorununa kesin çözüm) (2026-07-04)

> Belirti: modallarda (özellikle `createPortal(document.body)` ile render edilenler — RatingModal,
> MatchHistoryModal) bazı yazılar SİYAH/görünmez, bazı yeşil bg/gradyanlar boyanmıyordu.

- **Kök neden:** `client/tailwind.config.js` `turf` yalnız 400/500/600 tanımlıydı; kod tabanı ise
  92 dosyada `turf-100/200/300/700/800/900` gibi TANIMSIZ tonlar kullanıyordu. Tanımsız ton →
  Tailwind o sınıfı ÜRETMEZ → **no-op**: metin renksiz kalır (portal modalda body default'una
  düşer, siyah görünür), bg/gradyan tinti boyanmaz.
- **Kesin çözüm:** `turf` TAM yeşil skalaya (50–950, Tailwind `green` ile birebir) tamamlandı.
  Artık her `turf-XXX` gerçek renk üretir. Metin kullanımları açık tonlar (100-300 → okunur),
  koyu tonlar (700-900) yalnız bg tinti (`bg-turf-900/XX`) olduğundan dark-on-dark riski YOK.
- **KURAL:** Yeni renk tonu gerekiyorsa config'e ekle; **asla no-op (tanımsız) turf/pitch sınıfı
  bırakma.** `pitch` yalnız DEFAULT+surface — numeric `pitch-<n>` kullanma.
- Ek: MatchHistoryModal tarih bloğu arka planı yeşil tint → `bg-slate-800/60` (koyu, kullanıcı isteği).
- Doğrulama: client tsc (yalnız LocationStep) + build + cap copy ✓. Yalnız client → yeni native sürüm.

---

## 41. KALICI KURAL: Kullanıcı adı normalizasyonu — Instagram-stili küçük harf (2026-07-04)

### Kural
- Kullanıcı adları **her zaman** `^[a-z0-9._]{3,30}$` — yalnız küçük harf, rakam, nokta, alt çizgi.
- Türkçe girdi otomatik dönüştürülür: önce `toLocaleLowerCase('tr-TR')` (I→ı, İ→i), sonra
  transliterasyon ç→c ğ→g ı→i ö→o ş→s ü→u. Örn: `IŞIK` → `isik`. â/î/û gibi şapkalı harfler
  haritada **bilinçli olarak yok** — regex reddeder.
- Tek kaynak util'ler: `server/src/users/username.util.ts` ve `client/utils/username.ts`
  (birebir aynı mantık; birinde değişiklik → diğeri de güncellenir. Regex/haritayı ASLA kopyalama).

### Sunucu nerede normalize eder
- DTO katmanı: `CreateUserDto`/`UpdateUserDto` username alanında `@Transform(normalizeUsername)` +
  `@Matches(USERNAME_REGEX)` (Türkçe hata mesajı) — global `ValidationPipe(transform:true)` sayesinde
  Transform doğrulamadan önce çalışır; eski uygulama sürümlerinden gelen ham girdiye karşı asıl güvence.
- `users.service.ts`: `findOne` (login buradan geçer) ve `isUsernameTaken` girdiyi normalize edip
  `LOWER(user.username)` ile karşılaştırır — DB'de büyük harfli eski kayıt kalsa bile çalışır (bilinçli
  tasarım: deploy/veri sıralamasından bağımsız). `create` benzersizliği `isUsernameTaken` ile kontrol
  eder; `search` girdiyi normalize eder ("Işık" araması "isik"i bulur).
- `users.controller.ts checkUsername`: normalize + regex geçmeyen aday `{available:false}`.

### İstemci nerede normalize eder
- `sanitizeUsernameInput` (yazarken canlı: küçült + translitere + izinsiz karakteri at + 30 kes):
  kayıt `useRegister.handleChange`, profil `ProfileSettings` username inputu, `Login` username inputu.
- `normalizeUsername` (API öncesi): register/login payload, check-username paramı (+`excludeId`),
  profil PATCH payload'ı, `AddPlayerModal` arama terimi (görünen input değişmez).
- `ProfileSettings/components/ProfileForm.tsx` ölü koddu → silindi.

### Tek seferlik canlı DB işlemi (2026-07-04, kullanıcı onayıyla — §9 istisnası)
- Tek transaction: `"Emre Aydoğdu "` (id `57e0c623-...`, boşluklu geçersiz ad) kullanıcısı **kullanıcının
  açık talimatıyla** silindi; KANARYA takımı (tek üye, kaptan; id `eace80c9-...`) purge edildi
  (deleteAccount + purgeTeamRaw SQL sırası). `account_deletions`'a `reason='ADMIN_MANUAL'` audit kaydı yazıldı.
- Ardından `UPDATE "user" SET username = lower(username)` (10 satır). Sonuç: 14 kullanıcı, tamamı
  regex'e uygun, sıfır duplicate (transaction içi DO-blok doğrulamalarıyla teyit edildi).
- Mevcut JWT'lerdeki eski büyük harfli `username` payload'ı zararsız (her yerde `id` kullanılır).

---

## 42. Client mimari temizliği: ölü kod + Gemini kaldırma + modal colocation (2026-07-04)

`client/` klasörü deterministik import-grafiği analiziyle (266 kaynak dosya) denetlendi ve
yeniden düzenlendi. Üç değişiklik grubu:

### A. Ölü dosya temizliği (10 dosya silindi)
Hiçbir yerden import edilmeyen dosyalar: `BusinessNotificationsPanel`, `CreateMatchAnnouncementModal`,
`UI/NotificationBell`, `BusinessPitchSettings/DeletePitchModal`, `BusinessRegister/steps/PitchesStep`,
`BusinessRegister/steps/SummaryStep`, `JokerPoolHeader`, `MarketplaceHeader`,
`ProfileSettings/BlockedUsersModal`, `ProfileSettings/PasswordForm`.
Ayrıca AI Studio şablon kalıntıları: `metadata.json` silindi, `README.md` gerçek içerikle yeniden
yazıldı, kullanılmayan `assets/dimliLogin.png` (666KB kopya) silindi.

### B. Gemini AI tamamen kaldırıldı
- Proje Google AI Studio şablonundan türemişti; `services/geminiService.ts` (takım bio üretme +
  taktik önerisi) **hiçbir UI'dan erişilebilir değildi** (buton yorumda / handler hiç çağrılmıyor)
  ve `.env.local`'daki `GEMINI_API_KEY` zaten `PLACEHOLDER_API_KEY` idi — özellik canlıda hiç çalışmadı.
- Silinen/temizlenen: `geminiService.ts`, `useChat` içindeki `handleGetTactics`/`tactic` state +
  Chat.tsx "Koç'un Tavsiyesi" bloğu, `useMyTeam.handleGenerateBio` + TeamHeaderCard prop zinciri,
  `JokerDMChatInfoModal`'daki ölü import, `vite.config.ts` GEMINI define'ları, `@google/genai` paketi.
- ⚠️ `npm install` bu projede `--legacy-peer-deps` ister (`@capacitor-firebase/messaging@8` ↔ core v6
  peer çakışması — önceden beri var).

### C. KALICI KURAL: Modal yerleşimi — feature-first colocation
- **Tek feature'dan kullanılan modal, o feature'ın `components/` klasöründe yaşar**;
  `components/Modals/` yalnız **birden çok feature'ın paylaştığı** modallara aittir.
- 22 modal taşındı: Chat 6 (KendiAramizda x2, RematchProposal, MatchDetail, ManageJokers,
  JokerDMChatInfo), MyTeam 5 (AddPlayer, CreateTeam, JoinTeam, MatchHistory, UpcomingMatches),
  PitchBooking 4 (SlotDetail, Offer, NeedTeamRole, DirectionsConfirm), BusinessRegister 3
  (Facilities, LocationSelection, TimeSlots), Marketplace 1 (Challenge), JokerPool 1 (JokerProfile),
  TeamSettings 1 (ColorPicker), Register 1 (BirthDatePicker).
- `components/Modals/`'ta kalan 15 paylaşılan modal: BusinessInviteNotice + Rating (App.tsx global),
  Confirm, Success, ImageCrop, LocationFilter, Sort, CreateMatch, DateSelection, TimeSelection,
  BusinessTimePicker, InviteJoker, KeyboardAware (altyapı), PlayerDetail, TeamDetail.
- Yeni modal eklerken bu kurala uy; bir modal ikinci bir feature tarafından kullanılmaya
  başlarsa `components/Modals/`'a geri taşı.

### Rapor-only bulgular (yapılmadı, aday task'lar)
- Büyük dosyalar (bölme adayı): `Chat.tsx` 1090+ satır, `BusinessPitchSettings.tsx` 646,
  `CreateMatchModal.tsx` 594, `useChat.ts` ~490.
- Hook yerleşim tutarsızlığı: `useKeyboardHeight/useKeyboardScroll/useModalBodyClass` `utils/`ta,
  `useCurrentUser/useLocationGate` `hooks/`ta (CLAUDE.md yol referansları nedeniyle bilinçli ertelendi).
- Mock/dummy veri denetimi TEMİZ çıktı — tek meşru istisna `revenuecatService.ts` web/dev
  fallback'i (`dev_mock_customer_id`).

### Doğrulama
- `npx tsc --noEmit`: temiz (tek hata `LocationStep.tsx window.google` — önceden beri var, dokunulmadı).
- `npm run build`: başarılı. Eski `components/Modals/<TaşınanAd>` yollarına sıfır referans (grep).

## 43. KALICI KURAL: app-geneli metin seçimi + iOS callout kapalı (2026-07-04)

> Belirti: herhangi bir yazıya (başlık, etiket, kart metni) basılı tutunca WebView metni seçiyor +
> iOS "Copy / Look Up / Translate" callout'u çıkıyordu. Native uygulama standardı değil.

### Kural (client/ — index.css)
- `index.css`'te global: `* { -webkit-touch-callout:none; -webkit-user-select:none; user-select:none }`
  + istisna `input, textarea, select, [contenteditable="true"] { -webkit-touch-callout:default;
  user-select:text }`. Bu, §26'nın modal-bazlı çözümünü **uygulama geneline** taşır (o girdi
  "client'ta app-geneli user-select:none YOK" diyordu — artık VAR).
- **Neden CSS:** iOS `AppDelegate.swift` / Android `MainActivity.java` / `capacitor.config.ts`'te
  metin-seçimi/callout ayarı yok; native tarafta seçenek bulunmuyor → global CSS doğru/standart yol.
  Vite build → `cap sync` → WebView'de app-geneli etki eder.
- **Özgüllük:** `*` (0,0,0) her yeri kapatır; `input/textarea/select` (0,0,1) form alanlarında
  seçimi/imleci/yapıştır menüsünü geri açar. Kaçış kapısı gerekirse Tailwind `select-text` (0,1,0) ezer.
- **Etkilenmez:** long-press özellikleri (`useLongPress`: kanal/mesaj menüleri, kod kopyala) olay-tabanlı;
  kopyalama `navigator.clipboard`. Metin kopyalama artık **yalnız açık butonlarla** (ör. takım kodu rozeti).
- Eski dağınık `select-none`'lar (TeamHeaderCard, CelebrationScreen, Chat) global kuralca kapsandığı için
  gereksiz ama zararsız — bırakıldı. Yeni kodda ayrıca eklemeye gerek yok.

## 44. Maç Pazarı ölçeklenebilirlik + kart/modal zenginleştirme (2026-07-04)

> Hedef: 20 km'de 200 / 100 km'de 500 ilanda 50/50/50 sayfalamanın DOĞRU çalışması.
> Denetim bulgusu: sayfalama zaten vardı ama sıralama/tarih/`kendi_aramizda` filtreleri
> İSTEMCİDE yalnız yüklü sayfalara uygulanıyordu + kart verisi için sınırsız `GET /businesses` çekiliyordu.

### Sunucu (`match-announcements`)
- `findAll` yeniden yazıldı (Sahalar `findNearbyPaged` deseni): bounding-box ön-filtre →
  kelepçeli Haversine (`GREATEST/LEAST` — acos NaN fix) aday SQL'i (LIMIT'siz) → **in-memory
  whitelisted sıralama** (`distance|date_desc|date_asc|price_asc|price_desc|fair_play`, stabil
  ikincil anahtar `id`) → `slice(offset, offset+limit)` → sayfa id'leri kırpılmış hydrate.
- SQL'e taşınan filtreler: `match_type <> 'kendi_aramizda'` (istemci filtresi `hasMore`'u bozuyordu),
  `date`, işletme paritesi (`b.status='active'` + aktif/trial subscription join — askıdaki işletmenin
  ilanı artık listelenmez; eskiden kırık kart olarak görünüyordu).
- **Payload kırpma:** `team.captain` + `team.players` join'leri liste yanıtından kaldırıldı (team
  SKALER satırı kalır; deploy edilmiş bundle yalnız `captainId` okuyor — doğrulandı).
- **Eklemeli alanlar:** `pitchSummary {id,name,pricePerHour,imageUrl,endTime,business{id,name,district,city}}`
  + `pendingChallengeCount` (sayfa id'leri üzerinde tek gruplu COUNT). Hydrate `IN` sırası
  pageIds index haritasıyla düzeltilir (eski mesafe re-sort'u fiyat/tarih sıralamasını bozardı).
- **Geriye uyumlu zarf:** `paged=1` → `{items,total,hasMore}`; parametresiz → DÜZ DİZİ (eski
  uygulamalar etkilenmez, default sort=distance ile sayfa bileşimi bayt-aynı).
- `computeBoundingBox` `server/src/common/geo.util.ts`'e çıkarıldı (tek kaynak; BusinessService
  import eder).

### İstemci (Marketplace)
- `useMarketplace`: sınırsız `GET /businesses` çağrısı SİLİNDİ — kart/ChallengeModal verisi
  `announcement.pitchSummary`'den (`getPitchDetails(announcement)` artık ilan alır, pitchId değil).
  `date`+`sort` sunucuya gider; değişince fetch-key üzerinden sayfa-0 reset. `hasMore` sunucudan;
  offset = birikmiş liste uzunluğu (`offsetRef` silindi). Cache anahtarı `cached_matches_v2`
  (şema değişti); `MKT_BUSINESSES_CACHE_KEY` öldü, AuthContext eski literalleri bir kez süpürür.
- `getMatchAnnouncementsPaged` (api.ts): `getBusinessesPaged` aynası + eski-sunucu dizi fallback'i.
  **Deploy sırası: önce sunucu** (fallback pencereyi kapatır).
- Marketplace: "Daha Fazla Göster" butonu → **infinite scroll** (~600px eşik, PitchBooking deseni).
- Kart (boy sabit): kişi başı ücret (`≈X ₺/oyuncu`), `timeAgo` ("2 sa önce", `utils/time.ts`),
  `Bugün/Yarın · 4 Tem` tarih etiketi, `{n} istek` kehribar rozeti (pendingChallengeCount),
  takım rengi İNCE aksan (3px sol şerit + logo halkası, `utils/teamColors.ts` `toHex`).
- `TeamDetailModal` (paylaşılan): §35 gereği `createPortal`'a alındı (portal'sızdı!); başlık harici
  transparenttextures doku URL'i yerine takım renkli düşük-alfa gradyan (+3px aksan çizgisi, logo
  halkası); favori işletme görseli `coverImageUrl || pitches[0].imageUrl || Store ikonu`
  (DB: hiçbir işletmede cover yok, tüm sahalarda imageUrl var); takım açıklaması + "N oyuncu" rozeti.
- `LEGACY_COLOR_HEX`+`toHex` TeamHeaderCard'dan `client/utils/teamColors.ts`'e çıkarıldı (tek kaynak).

### Maç Pazarı ↔ Sahalar senkron kararı
Veri senkronu YOK ve olmamalı (payload şekilleri farklı; sayfalama state'leri bağımsız).
Filtre senkronu zaten var: koordinat+yarıçap `LocationContext`, tarih `FilterContext`. Doğru mimari bu.

### Doğrulama
- Lokal sunucu + lokal `dimli` DB'ye 170 seed ilan (test sonrası silindi): düz dizi uyumu ✓,
  `team.players/captain` yok ✓, `kendi_aramizda` sızıntısı 0 ✓, mesafe artan ✓, paged zarf +
  fiyat sıralaması ✓, 3 sayfa kesişimsiz (union=total=139) ✓, tarih filtresi ✓, sort injection →
  sessiz distance fallback ✓, `/pitch/:id` regresyon ✓, 100km yanıtı ~24ms ✓.
- `server npm run build` ✓, `client npm run build` ✓.
- ⚠️ Ortam notu: `server/` kökünde bayat `tsconfig*.tsbuildinfo` dosyaları `nest build`'in hiç .js
  emit etmemesine yol açıyordu (dist'te yalnız .d.ts) — silindi; aynı belirtide önce bunları sil.

---

## 45. Silinen takım/joker → öksüz sohbet ("durumsuz maç") temizliği (2026-07-05)

> Belirti: silinmiş bir takımla oynanan maçların MATCH_GROUP sohbeti Operasyon Merkezi'nde
> "durumsuz maç" olarak takılı kalıyor, açınca "Maç bilgisi bulunamadı", **silinemiyor** (istemci
> silme koşulu yalnız played/unplayed'e izin veriyor; öksüz kanalın durumu null). Aynı şekilde joker
> DM'i (JOKER_NEGOTIATION) jokerin hesabı silinince karşı tarafta ölü kalabilirdi.

### Kök neden ve mimari (kritik)
- MATCH_GROUP/JOKER_NEGOTIATION kanalının `relatedMatchId`'si `match_announcements.id`'ye işaret eder
  (**varchar↔uuid → `id::text` cast şart**). `chat_channels`'ta **soft-delete kolonu YOK**;
  `chat_participants_v2.channelId` ve `chat_messages.channelId` FK'ları **ON DELETE CASCADE** → tek
  `DELETE FROM chat_channels` katılımcı+mesajı da siler.
- Maç ilanını hard-delete eden **3 yol** vardı, hiçbiri chat kanalını temizlemiyordu →
  `purgeTeam` (teams.service.ts), `purgeTeamRaw` (users.service.ts §38 ikizi), `match-announcements.service.ts delete()`.
- Nüans: **sunucu `deleteChannel` öksüz kanalı zaten silebiliyordu** (durum null → engel yok); takılma
  tamamen **istemci** butonundandı. Kullanıcı kararı: kaynağında tamamen sil (istemci/uygulama sürümü YOK).

### Değişiklikler (server-only, geriye-uyumlu)
- **`purgeTeam` + `purgeTeamRaw`:** `match_announcements` silinmeden ÖNCE (subquery çözülsün diye)
  `DELETE FROM chat_channels WHERE type IN ('MATCH_GROUP','JOKER_NEGOTIATION') AND "relatedMatchId" IN
  (SELECT id::text FROM match_announcements WHERE team_id=$1)`. **§38: iki ikiz SENKRON — aynı commit.**
- **`match-announcements.service.ts delete()`:** `remove()` öncesi aynı desen tek ilana
  (`"relatedMatchId" = $1`, eşitlik). Onaylı maçı engelleyen guard yok → bu yol da öksüz üretebiliyordu.
- **`users.service.ts deleteAccount`:** mevcut `DELETE chat_participants_v2 WHERE userId` ÖNCESİNE
  `DELETE FROM chat_channels WHERE type IN ('JOKER_NEGOTIATION','DM') AND id IN (SELECT "channelId" FROM
  chat_participants_v2 WHERE userId=$1)` → 1:1 kanal tümüyle gider (cascade peer + mesaj), ölü DM kalmaz.
  **MATCH_GROUP bilinçli HARİÇ** (joker gruptan sadece ayrılır; maç + diğer takım ayakta kalır).

### Puanlama ETKİLENMEZ (doğrulandı)
`ratings` chat'ten bağımsız: `reservationId`(FK)+`type(BUSINESS|FAIRPLAY)`+`targetBusinessId/TeamId`.
`submitRating` takım-var-mı kontrolünü **yalnız FAIRPLAY**'de yapar → silinmiş rakibe rağmen **işletme
puanı verilebilir**. Puanlama yüzeyleri (App.tsx pending `RatingModal`, TakımProfili Geçmiş Maçlar
`MatchHistoryModal`) `getPendingRatings`/`getMatchHistory` → **yalnız reservation/ratings** okur, chat'e
dokunmaz. Canlı kanıt: rez. `7d91d44a` (Konyalılar vs silinmiş Mavi şimşekler) BUSINESS puanını temizlik
sonrası da koruyor.

### Tek seferlik canlı temizlik (kullanıcı onaylı, §9 istisnası)
`server/scripts/cleanup-orphan-chat-channels.ts` (cleanup-orphan-notifications.ts deseni; idempotent,
tek transaction, say→sil→doğrula). Öksüz = `type IN (MATCH_GROUP,JOKER_NEGOTIATION) AND relatedMatchId
NOT IN (SELECT id::text FROM match_announcements)`. Çalıştırıldı: **9 kanal silindi** (7 MATCH_GROUP:
UÇARLAR Kendi Aramızda + 2 Mavi şimşekler vs Konyalılar + 4 Mavi şimşekler vs Özeller; 2 JOKER_NEGOTIATION:
Joker DM Mehmet Uçar), cascade katılımcı+mesaj temizledi, kalan öksüz **0**. **Deploy: server Render'a;
istemci değişikliği YOK (yeni sürüm gerekmez).** Kod deploy'undan sonra gerekiyorsa script tekrar çalıştırılabilir.

### Doğrulama
Server `npm run build` ✓. Canlı DB (salt-okunur): öksüz kanal 0, öksüz katılımcı 0, öksüz mesaj 0,
`deletedTeamName`'li rezervasyonlar + BUSINESS puanları korunuyor.

## 46. OTP SMS güvenlik katmanı — hız limitleri + kilit + IP throttle (2026-07-06)

### Kök neden: "saatte 3 SMS" limiti hiç çalışmıyordu
Eski `checkRateLimit()` `otp_codes` satırlarını sayıyordu; ama her gönderim yeni kodu eklemeden
önce önceki doğrulanmamış kaydı SİLDİĞİ için sayaç hiç 3'e ulaşamıyordu → 4 OTP akışının
(kullanıcı kayıt, kullanıcı şifre sıfırlama, işletme kayıt, işletme şifre sıfırlama) hiçbirinde
sunucu-tarafı limit fiilen yoktu. Müşteri akışlarında "çalışıyor" görünen şey istemcideki 60 sn
geri sayımdı. Ayrıca "5 yanlış → 1 saat engel" diye bir mekanizma kodda hiç yoktu.

### Yeni mimari — tek ortak mekanizma: `OtpSecurityService`
`server/src/auth/otp-security.service.ts` + 2 yeni tablo (synchronize ile otomatik oluşur):
- **`otp_send_log`** (append-only): her gönderim DENEMESİ SMS'ten önce loglanır; hiçbir istek
  yolu silmez → sayım bir daha bozulamaz. Aynı zamanda SMS maliyet iz kaydı.
- **`otp_locks`**: 5 yanlış doğrulama → telefon 1 saat kilitli (TÜM amaçlarda, hem send hem verify).
  DB'de kalıcı (restart/deploy silmez).
- 4 send akışı `assertSendAllowed(phone, purpose)` + `recordSend`; 4 verify akışı
  `assertVerifyAllowed` + ortak `completeOtpVerification()` (auth.service.ts) kullanır.
- Limitler (env ile ayarlanabilir): `OTP_RESEND_COOLDOWN_SEC`(60), `OTP_MAX_PER_HOUR`(3, telefon+amaç),
  `OTP_MAX_PER_DAY_PHONE`(10, telefon başına tüm amaçlar/24s), `OTP_LOCK_DURATION_MIN`(60),
  `SMS_DAILY_LIMIT`(2000, sistem geneli/gün; **0 = kill-switch**, Render env ile deploy'suz kapatma;
  %80'de logger.warn, dolunca logger.error).
- Tüm limit ihlalleri tek tip gövde döner: `{statusCode:429, message:'<Türkçe>', retryAfter:<sn>}`
  + `Retry-After` header (AllExceptionsFilter). İstemci geri sayımı bu değerden beslenir.
- Gece 04:00 cron temizliği: 48s'ten eski log, süresi geçen kilitler, bayat otp_codes satırları.

### KALICI KURAL: zaman aritmetiği SQL'de yapılır (bu tablolarda)
`timestamp without time zone` kolonlarında DB-yazımlı değerler (now() default) OTURUM saat
dilimindedir; local Postgres `Europe/Istanbul`, canlı (Render) UTC. JS'te `getTime()` farkı local'de
3 saat kayar. Bu yüzden `otp_send_log`/`otp_locks` yaş/kalan-süre hesapları SQL'de
(`EXTRACT(EPOCH FROM (now()::timestamp - ...))`) yapılır; kilit yazımı da DB tarafında
(`now() + make_interval(...)`, raw upsert). `otp_codes.expiresAt` ise JS-yazılıp JS-okunur
(kendi içinde tutarlı) — o dokunulmadı. Karışık kullanma!

### IP bazlı throttle + trust proxy
`@nestjs/throttler@6` eklendi. `app.module.ts`'te `ThrottlerModule.forRoot` (otp-minute 10/dk,
otp-hour 30/saat) — GLOBAL guard bağlanmadı; yalnız `auth.controller.ts`'deki 8 OTP endpoint'inde
`@UseGuards(OtpThrottlerGuard)` (`server/src/common/otp-throttler.guard.ts`, Türkçe 429 + retryAfter).
`main.ts`: `app.getHttpAdapter().getInstance().set('trust proxy', 1)` — Render proxy'si arkasında
gerçek istemci IP'si için ŞART (DuplicateRequestInterceptor IP anahtarını da düzeltir).
Değerler CGNAT (mobil operatör paylaşımlı IP) nedeniyle bilinçli cömert.

### İstemci
`getRetryAfterSeconds()` (`client/utils/apiError.ts`): 429 gövdesinden geri sayım tohumlar.
İşletme kayıt (useBusinessRegister + OtpVerificationStep) ve işletme şifre modalına
(BusinessForgotPasswordModal — tekrar gönder butonu hiç yoktu, eklendi) 60 sn geri sayım geldi;
müşteri hook'ları (useRegister, useForgotPassword) 429'da geri sayımı sunucu değerinden başlatır.
NOT: modalda `useEffect` erken `return null`'un ÜSTÜNDE (hook kuralı).

### Mikro-sıkılaştırmalar
`crypto.randomInt` (Math.random yerine), `timingSafeEqual` kod karşılaştırması,
`OtpCode`'a `@Index(['phone','purpose'])`, `sendPasswordResetOtp`'a eksik `validatePhoneFormat`,
`isBusinessOwnerPhoneVerified`'a eksik `expiresAt` kontrolü. OTP kodu bilinçli düz metin
(10^6 uzay her hash'te anında kırılır; asıl koruma TTL+deneme sınırı+kilit).

### Doğrulama (local, 3100 portu, NetGSM env boş → SMS no-op)
cooldown ✓, saatlik 3 ✓, günlük telefon tavanı (amaç karışık) ✓, 5 yanlış → kilit (send+verify
429) ✓, e-posta anahtarlı işletme akışı telefon cooldown'una takılıyor ✓, IP throttle 10/dk ✓,
bütçe %80 warn + limit error + 429 ✓, kill-switch=0 ✓, mutlu yol (doğru kodla verify user+business) ✓,
geçersiz telefon 400 ✓. Test verileri temizlendi.

## 47. "Yakınımda" filtre denetimi + Marketplace pill stili birleştirme + getJokers bounding-box (2026-07-06)

### Denetim sonucu: filtre mimarisi SAĞLAM
`radius` tek global kaynak `LocationContext`'te (`location_radius` localStorage anahtarı, varsayılan 20,
restart'a dayanıklı); tüm sayfalar aynı context'i okur → bir yerde değişince her yerde değişir (doğrulandı).
Tek paylaşılan `LocationFilterModal` (5-100 km slider). Filtreleme tamamen sunucu-tarafı (lat/lng/radius
→ Haversine); `requireGeoFilter` (validate-geo.util.ts) lat/lng zorunlu + radius max 100 kırpma yapıyor.
Radius değişiminde uçuştaki fetch `fetchGenRef` nesil sayacıyla iptal ediliyor.

### KALICI: filtre pill stili — kanonik kaynak Marketplace.tsx
Sahalar (`PitchBooking/components/FilterBar.tsx`) ve Joker Havuzu (`JokerPool/components/JokerLocationFilter.tsx`)
filtre satırları Marketplace'in eğik pill yapısına BİREBİR geçirildi: `px-3 py-2.5 border rounded-xl
text-[11px] font-bold skew-x-[-6deg]` + iç `span.skew-x-[6deg]` ters-eğim + `w-3 h-3` ikon.
Renk durumları: Yakınımda (hep aktif) `bg-turf-900/50 border-turf-500 text-white`; Sırala toggle aktif
`bg-turf-900/40 border-turf-500 text-turf-400`; tarih `border-turf-500/50 bg-turf-900/20`. Üç dosyada
kanonik yorum var — stil değişecekse ÜÇÜ birden güncellenir. FilterBar'daki arama ikon hapı `w-10` eğik,
yüksekliği flex stretch'ten alır; AÇIK arama overlay'i eğiksiz + `h-[46px]` + koşullu mount/autoFocus
(iOS klavye çözümü) DOKUNULMADI. CreateMatchModal rozeti sadece renk aldı (skew yok — salt gösterim,
düz input yanında). TeamHomeBusiness ve FavoriteBusinesses varyantları BİLİNÇLİ farklı bırakıldı.
Ortak FilterPill bileşeni bilinçli çıkarılmadı (varyantlar erken ayrışıyor; 4. yüzey gelirse ayrı görev).

### getJokers bounding-box + kısmi indeks (§11 F6 borcu kapandı)
`users.service.ts getJokers`: ortak `computeBoundingBox` (geo.util.ts) ile indeksli `latitude/longitude
BETWEEN` ön-filtre eklendi (box paramları $4-$7, position/sharesFee'nin dinamik indeksleri korunarak ÖNCE
eklenir); Haversine kesin eşik kaldı → sonuç kümesi birebir aynı (psql'de eski/yeni sorgu diff'i: 100 joker,
sıfır fark). Parite düzeltmeleri: `acos(GREATEST(-1,LEAST(1,...)))` kırpması (aynı koordinatta FP taşması
"input is out of range" verirdi) + `ORDER BY distance_km, id` kararlı sıralama (§27 kuralı).
`user` entity'ye kısmi bileşik indeks: `IDX_user_joker_lat_lng (latitude, longitude) WHERE "isJoker"=true`
(synchronize oluşturur; SQL'de isJoker literal olduğundan kullanılabilir — EXPLAIN ile seçici kutuda
Bitmap Index Scan doğrulandı; 255 satırlık local DB'de planlayıcı haklı olarak Seq Scan seçiyor, ölçekte devreye girer).

### 10-20bin kullanıcı için kalan ölçek riskleri (konum yolları — ileriki görevler)
1. ~~`business.service findNearbyPaged`: her sayfa isteğinde TÜM aday kümesi hydrate~~ → **ÇÖZÜLDÜ (§49)**.
2. ~~`match-announcements findAll` her listelemede `deleteExpired()` çalıştırıyor~~ → **ÇÖZÜLDÜ (§49)**
   (not: DELETE değil 2 UPDATE'ti — yine de okuma yolunda yazmaydı).
3. Konum PATCH yazma yükü: **kanıt toplandı (§49)** — local 10k kullanıcı/600 joker'de EXPLAIN: getJokers
   tekil lat/lng indekslerini KULLANMIYOR (planlayıcı isJoker tekilini, o yokken kısmi `IDX_user_joker_lat_lng`'i
   seçiyor; tekiller transaction'da DROP edilince plan değişmedi). Tekil lat/lng `@Index`'lerin entity'den
   kaldırılması BEKLEMEDE: önce kısmi indeksin canlıya deploy olması (canlıda henüz YOK, 2026-07-06 SELECT ile
   doğrulandı), birkaç gün `pg_stat_user_indexes` izlemesi (kısmi idx_scan artarken tekiller sabit), sonra AYRI
   deploy'da kaldırma (synchronize DROP eder; düşük trafik saati). 250m eşiği + iOS 3dk/Android 2dk interval
   client'ta doğru çalışıyor (LocationContext, kod okunarak doğrulandı — değişiklik gerekmez).

## 48. Takım logosu baş-harf fallback'i uygulama geneline tamamlandı (2026-07-06)

§20de8d5 ile eklenen kanonik desen (`teamLogoSrc`/`teamInitialsAvatar`, client/utils/teamColors.ts)
5 noktaya uygulanmıştı; kalan eksikler tarandı ve kapatıldı. Meydan Oku (ChallengeModal) modalında
logosuz rakip takım `via.placeholder.com` erişilemeyince kırık "?" görseli veriyordu — asıl bildirilen hata.

### KALICI KURAL
Takım logosu render eden HER `<img>` şu iki güvenceyi taşımalı:
1. `src` = `teamLogoSrc(team)` (nesne) VEYA düz alanlarda `team.logo/logoUrl || teamInitialsAvatar(team.name)`.
2. `onError` = `(e) => { const el = e.currentTarget; el.onerror = null; el.src = teamInitialsAvatar(name); }`.
Ham `logoUrl || 'placeholder'` VEYA fallback'siz `<img src={logoUrl}>` YASAK. Logosuz takımda genel
ikon (Users/Shield) göstermek de artık tercih edilmez — baş-harf avatarı kullan (mevcut takım-renkli
gradyan+harf kutuları — TeamHeaderCard/JoinTeamModal/Chat MatchDetail — korunur, sadece bozuk-URL için
onError eklendi).

### Bu turda düzeltilen noktalar
- Kırık (fallback yok): ChallengeModal (Meydan Oku), CreateMatchModal footer rozeti.
- İkon→baş-harf: PitchBooking SlotDetailModal (6), BusinessDashboard SlotDetailModal (2),
  TeamInvite, BusinessNotificationsPage teamLogo() helper, ReservationRequestDetailModal.
- Sadece onError emniyeti (yerel harf fallback'i korundu): Chat MatchDetailModal, Chat MessageBubble
  avatar, TeamHeaderCard, JoinTeamModal.
- Not: ilk otomatik tarama ReservationRequestDetailModal ve MessageBubble'ı "güvenli" sanıp kaçırmıştı;
  grep denetimi (`img src={...logo}` ∧ ¬onError) ile yakalandı — bu grep gelecekte de regresyon kontrolü.

## 49. Ölçek turu: sayfa-önce hydrate + okuma yolundan yazma kaldırma + bildirim sayfalama (2026-07-06)

> Hedef ölçek: 10bin kullanıcı / 200 işletme / 2bin ilan / 600 joker. §47'deki risk 1-2 kapatıldı,
> risk 3 kanıtlandı (karar canlı izlemeye bağlı). Golden-diff (38 kombinasyon: 5 sort × 3 offset ×
> q'lu/q'suz business + 4 sort × 2 offset ilan) önce/sonra BİREBİR aynı çıktı.

### KALICI DESEN: skaler anahtar → sırala/dilimle → yalnız sayfayı hydrate → geri diz
`business.service.ts findNearbyPaged`: `geoCandidates(geoFilter, withSortKeys)` bayrakla genişletildi —
bayrak true iken (yalnız findNearbyPaged) name/rating/ratingCount + ilk-pitch fiyatı (correlated subquery:
en eski `created_at`'li approved+silinmemiş pitch, `ORDER BY created_at, id LIMIT 1`) skaler gelir ve
"≥1 approved pitch" koşulu SQL'e iner (EXISTS). Bayrak false iken SQL bayt-aynı → legacy `findAll` yolu
etkilenmez. Akış: skaler adaylar → q filtresi → sort + id tie-break → slice → `fetchBusinessesByIds(pageIds)`
→ `orderIndex` Map ile sayfa sırasına geri diz. Kanıt: 52 aday'da `hydrate=20` (sayfa boyutu); eskiden 52'nin
tamamı pitches+timeSlots join'iyle çekiliyordu (metropolde 10-20k satır → ~600-800 satır).
Nüans: aynı `created_at`'li pitch'lerde fiyat seçimi artık `p.id ASC` ile deterministik (eski JS stable-sort
IN-sırasına bağlıydı); golden-diff'te fark çıkmadı.

### KALICI KURAL: sıcak okuma yolunda UPDATE/DELETE yasak — WHERE dışlama + cron
`match-announcements`: findAll'daki inline `deleteExpired()` (2 UPDATE) SİLİNDİ. findAll raw SQL'ine
`AND (ma.date > $9 OR (ma.date = $9 AND ma.time >= $10))` (nowInIstanbul), findByPitch'e aynı andWhere
eklendi. PENDING→EXPIRED geçişi YALNIZ saatlik cron'da (`handleCron`): artık tüm PENDING'leri relation'larla
yüklemek yerine süresi geçmişleri SQL'de filtreler + durum geçişleri `In(ids)` batch (ilan başına save yok);
kaptan bildirimi döngüsü korunur; bağlı PENDING rezervasyonlar da `In(ids)` ile EXPIRED. Kanıt: geçmiş saatli
PENDING test ilanı findAll/findByPitch'te görünmedi VE statüsü PENDING kaldı (okuma yazmıyor); 21:00 cron'unda
EXPIRED + kaptan bildirimi + batch log. EXPIRED statüsünün başka tüketicisi yok (grep, kırılma yok).
Not: iki server aynı local DB'de cron çalıştırırsa kaptan bildirimi duplike olur (dev artefaktı; canlı tek instance).

### Bildirimler (müşteri): sunucu sayfalama + read-all + N+1 batching + infinite scroll
- Server `findByUser(userId, opts?)`: `limit` yoksa legacy limitsiz dizi (yayındaki sürümler kırılmaz —
  §27 deseni); varsa `take: limit+1` (hasMore) + `skip` + `count` → `{items,total,hasMore}`. Controller clamp
  1..50 (varsayılan 20). `PATCH /notifications/read-all` → tek `update({userId, read:false}, {read:true})`
  (`markAllAsReadForOwner` emsali). Rota sırası: `read-all`, `:id/read`'den ÖNCE tanımlı.
- CHALLENGE self-repair N+1 → `enrichChallengeNotifications`: In() toplu sorgular (challenges → chatChannels →
  matchAnnouncements, sayfa başına ≤3 sorgu + tek batch save). **UUID regex ön-filtresi ŞART** — relatedId
  serbest varchar, In() uuid kolonda geçersiz değerle patlar (eski findOne'lar hatayı yutuyordu).
- Client `useNotifications`: PAGE_SIZE=20, fetchGen nesil guard'ı + id-dedup append (useJokerPool deseni),
  `NOTIFICATIONS_CACHE_KEY` stale-while-revalidate sayfa-0. Okundu işaretleme: bildirim-başına PATCH döngüsü
  (50 okunmamış = 50 istek!) → tek `markAllNotificationsRead()` (eski sunucuya 404 sigortası: per-id fallback).
  **`GET /teams` tam dökümü kaldırıldı** — kaptanlık `useCurrentUser().team.captainId === id`'den türetilir
  (tek-takım modeli, useMarketplace.isAuthorized emsali); join-requests/challenges artık ≤1 takım × 2 istek
  (Promise.allSettled). Socket refetch → 1sn debounce'lu sayfa-0 reset. Tabs "TÜMÜ" sayacı = sunucu `total`.
- Davranış notu: 20+ bildirim gerisindeki eski davet ilk açılışta MATCH_REQUESTS'te görünmez (scroll ile gelir) —
  davetler taze doğalı, bayatları cron siliyor; gerekirse server-side type filtresi aday-görev.

### Eklenen indeksler (synchronize oluşturur; canlıya deploy'la gider)
`pitches(business_id, approvalStatus)` bileşik, `time_slots(pitchId)`, `notifications(userId, createdAt)` bileşik.
Canlı DB tespiti (2026-07-06, salt SELECT): notifications tablosunda PK dışında HİÇ indeks yoktu;
pitches/time_slots FK'ları indekssizdi.

### Doğrulama (local şişirilmiş DB: 10bin kullanıcı/600 joker/52 işletme/204 ilan)
Golden-diff birebir; bildirim curl'leri: limit=20 → zarf, limitsiz → dizi, clamp 500→50, read-all tek UPDATE
(42 okunmamış → unread-count 0); jest 3/3; client build temiz; getJokers 600 jokerde 18ms.
Sentetik veri temizliği (istenirse): `DELETE FROM "user" WHERE username LIKE 'scaletest_%';`
`DELETE FROM notifications WHERE message LIKE 'Sayfalama testi%' OR message LIKE 'Enrichment testi%';`
`DELETE FROM match_announcements WHERE description='GOLDEN-TEST-EXPIRED';`

### Aday-görevler (bu turda bilinçli YAPILMADI)
- Sayfasız endpoint'ler: `GET /teams` (findAll — client sıcak kullanımı bu turla kalktı ama endpoint limitsiz),
  challenges listeleri, join-requests, ratings pending/history, reservations my-team/upcoming, chat channels
  listesi, user-blocks. İşletme bildirim sayfalaması (`GET /business-owner/notifications`).
- Eksik FK indeksleri: ratings hedef kolonları, `challenges.toMatchId`, `pitch_change_requests.businessId`.
- Ölçekte `synchronize:false` + migration altyapısı; çoklu-instance socket presence → Redis adapter.
- `markAsRead`/`delete` sahiplik kontrolü (güvenlik turu konusu). Challenge-accept expiry guard'ı
  (`challenges.service.updateStatus` ilan süresi kontrolü yapmıyor; kabul yüzeyi SQL+client filtreli, pencere ≤60dk).
- MATCH_REQUESTS sekmesi türetme sınırı için server-side type filtresi.

## 50. Çevrimdışı deneyim (Facebook-tarzı): NetworkContext + banner + boş-durum ayrımı + önbellek genişletmesi (2026-07-07)

> Sorun: internet kopunca boş "mavi ekran" + "Veri bulunamadı" (asıl yüzey BusinessDashboard tam-ekranı;
> müşteri sayfalarında sessiz boş listeler). Karar (kullanıcı onaylı): @capacitor/network + axios sinyali,
> kalıcı üst banner + 2sn yeşil "Bağlandı" + otomatik yenileme, listCache'in Chat/Takımım/İşletme-Dashboard'a
> genişletilmesi. Tam offline-first (mutasyon kuyruğu) bilinçli KAPSAM DIŞI.

### KRİTİK BUGFIX: ağ kesintisi ≠ oturum düşmesi
- `api.ts` interceptor'ında 401/403-doğrulama isteği ağ hatasıyla düşünce (`!ve.response`)
  `auth:sessionExpired` atılıyordu → kullanıcı ağ kesintisinde YANLIŞLIKLA login'e atılıyordu. Kaldırıldı;
  o dal artık `network:apiNetworkError` window event'i atar (NetworkContext dinler).
- Aynı ilke MyTeam'de: `/users/me` ağ hatasında `currentUser null → <Navigate to=/login>` vardı — artık
  ortak store snapshot'ı + `loadError` ile OfflineEmptyState gösterilir, login'e atılmaz.

### KALICI MİMARİ: ağ durumu TEK KAYNAK = NetworkContext (client/contexts/NetworkContext.tsx)
- Sinyaller: ① @capacitor/network listener (uçak modu anında; web/dev'de navigator.onLine fallback),
  ② api response interceptor'ı (her başarılı yanıt → online; `ERR_NETWORK` → offline; **ECONNABORTED/timeout
  offline SAYILMAZ** — Render cold-start yanlış pozitifi), ③ `network:apiNetworkError` event'i (verifyAxios boşluğu).
- Kurtarma: offline'ken 12sn'de bir `api.get('/', {timeout:5000, validateStatus:()=>true})` probe — HERHANGİ
  bir HTTP yanıtı = erişilebilir; eklentinin connected event'i probe'u hemen tetikler (önce probe, sonra online).
- `goOnline()` yalnız false→true geçişinde: `network:reconnected` window event + `fetchCurrentUser({force:true})`.
- Provider EN DIŞTA (`<NetworkProvider><AuthProvider>...`). Socket sinyali BİLİNÇLİ kullanılmıyor
  (SOCKET_URL prod / BASE_URL LAN çelişkisi + token'sız bağlanmıyor).
- StrictMode güvenliği: interceptor `eject(id)`, listener `.then(h=>h.remove())`, interval/timer cleanup.

### KALICI DESEN: sayfa hook'larında çevrimdışı üçlüsü
1. `useOnReconnect(cb)` (client/hooks/useOnReconnect.ts) — 'network:reconnected' dinler, cb ref'te; her ana
   sayfa hook'u kendi sayfa-0 tazelemesini bağlar (Marketplace/PitchBooking/JokerPool/Notifications/Chat/
   MyTeam/BizDashboard/BizStats — pull-to-refresh'lere dokunulmadı).
2. `isNetworkError(err)` (utils/apiError.ts — yanıtsız + ERR_NETWORK|ECONNABORTED): catch'te
   `setLoadError(isNetworkError(err) ? 'network' : 'generic')`; boş listede `loadError==='network'` →
   `<OfflineEmptyState onRetry=...>` (client/components/OfflineEmptyState.tsx, accent: müşteri turf /
   işletme orange, fullScreen varyantı), değilse mevcut gerçek boş-durum. Banner'dan farklı olarak timeout
   DA ağ hatası sayılır (bilinçli — yavaş ağda "boş sonuç" denmez).
3. Sayfa-0 önbelleği: `readListCache`/`readObjectCache` lazy-init + fetch başarısında write.
   **Nesne varyantı** `readObjectCache/writeObjectCache` ({userId, value} zarfı) listCache'e eklendi.

### OfflineBanner (client/components/OfflineBanner.tsx, App.tsx'te koşulsuz mount)
- createPortal(document.body) (§35); `fixed top-0 z-[55] pointer-events-none` — z haritası: sayfa
  başlıkları/Navbar/zil z-50 ALTINDA, modallar z-[60]+ ÜSTÜNDE kalır; overlay (layout push değil — sayfalar
  fixed inset-0 desenli). Safe-area: YALNIZ `env(safe-area-inset-top, 0px)` — `max(...,20px)` Android'de
  hayalet boşluk yaratır (Android'de StatusBar overlay DEĞİL → inset=0; iOS'ta çentik arkası boyanır).
- Faz: offline `bg-red-900` "İnternet bağlantısı yok — son veriler gösteriliyor" / reconnected `bg-green-600`
  "Bağlandı" 2sn (timer cleanup'lı) / hidden. translateY animasyonu.

### Önbellek anahtarları (listCache.ts) + hijyen
- Yeni: `CHANNELS_CACHE_KEY` (Chat ilk 30 kanal), `TEAM_CACHE_KEY` ({team} — takımsızsa {team:null} yazılır,
  bayat takım kalmaz), `BIZ_DASHBOARD_CACHE_KEY` ({date,data,subscription} — YALNIZ bugünün verisi yazılır/okunur,
  tarih bağımlı), `BUSINESSES_CACHE_KEY` v2 (PitchBooking'in eski çıplak 'cached_businesses' + cache_cleared_v3
  bloğu kaldırıldı, kullanıcı-kapsamlı zarfa taşındı). İşletme token'ında sub = owner.id (auth.service
  loginBusinessOwner) → listCache userId zarfı işletme tarafında da doğru çalışır.
- AuthContext.clearCustomerCaches: tüm yeni anahtarlar + eski literal süpürme ('cached_businesses',
  'cache_cleared_v3' dahil).

### Kurulum/deploy notları
- `@capacitor/network@^6` (6.x PİNLİ — core ^6.2.1; 7/8 kırar), `npx cap sync` yapıldı (13 eklenti).
  cap sync macOS'ta CocoaPods `unicode_normalize` hatası verirse `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` ile çalıştır.
- Native kod içerir → YENİ iOS/Android build ZORUNLU (pod/gradle otomatik sync'lendi; Android
  ACCESS_NETWORK_STATE manifest-merge ile gelir, kullanıcı istemi yok; iOS izin gerektirmez).
- Ön-var-olan tsc hatası (BusinessRegister/LocationStep.tsx window.google) bu turla İLGİSİZ, dokunulmadı.

### Cihaz test listesi (kullanıcı)
Uçak modu aç → banner anında; kapat → ≤12sn'de yeşil "Bağlandı" + listeler kendiliğinden tazelenir.
LAN server durdur → gezinti banner + cache'li sayfalar bayat veri, cache'sizler "Bağlantı yok + Tekrar Dene".
iOS çentik arkası dikişsiz; Android status bar altı. 401+kesinti kombinasyonunda login'e atılmama.
Hesap değişiminde önceki kullanıcının kanal/takım cache'inin görünmemesi (userId zarfı).

---

## 51. Takımım turu: kadro oyuncu kartı + buton renk düzeni + banner metni + kayıt autofocus + /teams hassas alan temizliği (2026-07-07)

> 4 kullanıcı isteği + keşifte bulunan güvenlik açığı (kullanıcı onaylı). Tümü JS/TS —
> native kod DEĞİŞMEDİ (yeni pod/gradle yok); değişikliklerin cihaza gitmesi için yine de
> yeni uygulama sürümü gerekir (JS bundle app içinde paketli). Server → Render deploy.

### A. Offline banner metni (client/components/OfflineBanner.tsx)
- "İnternet bağlantısı yok — son veriler gösteriliyor" → "İnternet bağlantısı yok" (kullanıcı kararı).
  §50'deki banner davranışı aynen; yalnız metin kısaldı.

### B. Takımım aksiyon butonları renk kararı (TeamActionButtons.tsx)
- "Takım İstekleri" mavi → **amber→koyu turuncu** (`from-amber-600 to-orange-700`,
  `shadow-amber-600/20`, border kaldırıldı — diğer iki butonla aynı yapı). Gerekçe: onay-bekliyor
  anlamı turuncu; **işletme tarafının parlak turuncusu (orange-500 #f97316) ile karışmasın** diye
  daha derin/mat ton seçildi (AskUserQuestion ile 3 seçenekten kullanıcı seçimi).
- Yaklaşan Maçlar (`turf-600→green-600`) ve Geçmiş Maçlar (`purple-600→indigo-600`) dokunulmadı.

### C. Kadro'da oyuncu bilgi kartı (MyTeam)
- Kadro satırına dokunma → **paylaşılan `PlayerDetailModal`** (JokerPool kartıyla aynı tasarım)
  salt-bilgi modunda (aksiyon prop'suz); kendine dokununca `isMe` + "Profili Düzenle" →
  `/settings/profile` (ProfileHeaderCard deseni). 3-nokta butonu `e.stopPropagation()` ile
  aksiyon sheet'ini açmaya devam eder.
- `useMyTeam.mapRoster` kart alanlarıyla genişledi (secondaryPosition/location/birthDate/foot/
  nationality/favoritePitchIds←favoriteBusinessIds); create yolundaki mükerrer inline map
  `mapRoster`'a bağlandı (tek kaynak). `useTeamModals`'a `playerCardModal` state'i eklendi.
- Misafir oyuncular bölümü dokunulmadı (guestPlayers MyTeam'de sabit `[]`).

### D. GÜVENLİK — /teams yanıtlarında hassas alan temizliği (server/src/teams/teams.service.ts)
- **Açık:** `GET /teams`, `GET /teams/:id`, `GET /teams/search/:term` (üçü de GUARD'SIZ/anonim)
  oyuncu ve kaptanların TAM user entity'sini döndürüyordu: **password hash, email, phone,
  pushToken, GPS lat/lng, chat-ban alanları, phoneVerified** sızıyordu.
- **Çözüm:** `sanitizeUser` helper + `SENSITIVE_USER_FIELDS` listesi; üç okuma yolunda players +
  captain temizlenir. **KALICI KURAL: User'a yeni hassas kolon eklenirse bu listeye de ekle!**
- Güvenli çünkü: alanlar "absent" bırakılır (null yazılmaz) → `Team.players` OneToMany ve
  `Team.captain` OneToOne **cascade'siz**, `save(team)` bu nesneleri yazmaz (FK yalnız id'den).
  İşletme panelindeki kaptan-telefonu özelliği **reservations** payload'ından gelir — etkilenmez.
- Doğrulama: local 3100 + curl → 3 uçta da sızıntı alanları YOK, kart alanları (birthDate/foot/
  nationality/favoriteBusinessIds...) duruyor; işlevsel akışlar (rol değişimi/atma) FK id'lerle çalışır.

### E. Kayıt sihirbazı adım 1'de otomatik klavye (UsernameStep.tsx)
- Mount + 350ms (animate-step-in 0.32s bitişi) → `inputRef.focus()`; Android'de ek olarak
  `Keyboard.show()` (Android-only API) — programatik focus bazı cihazlarda IME açmayabiliyor.
- **KALICI BİLGİ (iOS klavye):** Capacitor çekirdeği `keyboardShouldRequireUserInteraction=false`
  ayarlar (CAPBridgeViewController.swift + WKWebView swizzle) → **iOS'ta programatik focus klavyeyi
  HER ZAMAN açar**; jest bağlamı gerekmiyor (OtpInput'un effect-focus'u zaten kanıt).
  FilterBar'daki "yalnız jest içindeki taze mount+autoFocus güvenilir" notu bu nedenle fazla temkinli.
- Adım 1'e geri dönüşte de (key={step} remount) aynı davranış — bilinçli/tutarlı.

### Doğrulama
- server `npm run build` ✓ + eslint (teams.service) ✓; client `tsc --noEmit` (yalnız ön-var-olan
  LocationStep) + `vite build` + `cap copy` (ios+android) ✓. Cihaz testi: kadro kartı (kendisi/
  arkadaş/3-nokta ayrımı), buton renkleri, banner metni, Kayıt Ol → klavye (iOS+Android).

---

## 52. Takım İstekleri yalnız bekleyenler + yardımcı kaptan 409 guard'ı (2026-07-07)

> Kullanıcı kararı: Takım İstekleri = "cevap bekleyen istekler" ekranı; kabul edilenler listeden
> düşer. Ayrıca 3. yardımcı kaptan denemesinde sahte "YENİ YARDIMCI!" başarısı düzeltildi.

### A. Takım İstekleri: yalnız PENDING
- **Meydan okumalar** (`challenges.service.findActiveOutgoingByTeamId`): `status IN
  (PENDING,ACCEPTED)` → yalnız `PENDING`. `/challenges/team/:id/active` tek tüketici =
  TeamRequestsModal. Marketplace/PitchBooking "zaten meydan okundu" göstergesi FARKLI endpoint
  (`/challenges/team/:id`, tüm statüler) — ona DOKUNMA.
- **Joker davetleri** (`notifications.service.getTeamJokerInvites`): MATCH_GROUP chat üyelerinden
  `JOINED` türetme bloğu KALDIRILDI — yalnız bekleyen JOKER_INVITE bildirimleri döner; bekleyeni
  kalmayan maç grupları `jokers.length===0 → continue` ile gizlenir. Tek tüketici aynı modal.
- Client'ta değişiklik yok (STATUS_LABEL/pill/sayaçlar otomatik uyumlu).

### B. Yardımcı kaptan sınırı — SESSİZ ATLAMA YOK kuralı
- **KÖK NEDEN:** `teams.service.updatePlayerRole` (VICE) ve `updateViceCaptains` (add) 2 sınırına
  takılınca sessizce atlayıp 200 dönüyordu; client her 200'de başarı modalı basıyordu.
- **KALICI KURAL:** limit/iş kuralı ihlalinde sessiz no-op + 200 DÖNME — `ConflictException`
  (Türkçe mesajla) fırlat ki istemci sahte başarı göstermesin. İki metotta da:
  `'Bir takımda en fazla 2 yardımcı kaptan olabilir.'` (zaten-yardımcıysa idempotent kalır).
- Bonus tutarlılık: kaptan yapılan oyuncu `viceCaptainIds`'ten düşürülür (hayalet slot bitti).
- **Client:** `SuccessModal`'a amber `VICE_LIMIT` uyarı tipi (başlık "YARDIMCI SINIRI",
  AlertTriangle); `useTeamRoster.handlePromotePlayer` VICE'ta ①API öncesi ön-kontrol
  (`viceCaptainIds.length>=2` → modal, istek atılmaz), ②catch'te `409` → aynı modal
  (bayat state yarışı), diğer hatalar mevcut kırmızı banner.

### DB bulgusu (soruşturma, canlı değil LOKAL)
- "Şahin United KABUL EDİLDİ" satırı seed/test artığıydı: iki challenge AYNI mikrosaniyede
  (tek transaction = elle toplu insert), kabul akışının yan etkileri (chat/rezervasyon/CONFIRMED/
  bildirim) hiç yoktu. Uygulama hatası DEĞİL. Lokal DB'den silindi (tek seferlik DELETE).
  Teşhis ipucu: gerçek kabul = `challenges.updateStatus` → maç CONFIRMED + chat + rezervasyon.

### Doğrulama
- Lokal 3100 + kaptan JWT'siyle curl: `/challenges/.../active` yalnız PENDING ✓;
  `/notifications/joker-invites/...` yalnız PENDING jokerli 2 grup ✓; 2 yardımcı doluyken
  3.'ye VICE → **HTTP 409** + mesaj, DB değişmedi ✓. server build+lint ✓; client tsc
  (yalnız LocationStep) + build + cap copy ✓. Native kod değişmedi → yeni sürüm JS bundle taşır.

---

## 53. Rakip modal birleştirme + JokerPool akışkan başlık + kadro sırası + VICE_LIMIT kalıcı (2026-07-07)

> 4 küçük istek, hepsi client-only (server yok; yeni sürüm JS bundle taşır).

- **Sahalar "Rakibi Görüntüle" → paylaşılan modal:** PitchBooking'in YEREL
  `components/TeamDetailModal.tsx`'i SİLİNDİ; `PitchBooking.tsx` artık paylaşılan
  `components/Modals/TeamDetailModal`'ı kullanır (Marketplace/Notifications ile aynı desen:
  `isOpen + teamId + currentUserId`; `viewingTeam` state'i ve ActiveMatchesList dokunulmadı —
  `viewingTeam.id` geçilir). Paylaşılan modalın tüketicileri artık 3: Marketplace,
  Notifications, PitchBooking.
- **JokerPool başlığı (KALICI desen — buton + başlık aynı satırda):** başlık `whitespace-nowrap`
  + `fontSize: clamp(1.25rem, calc((100vw - 204px) / 6.7), 2.75rem)` (204px = maks buton +
  padding + gap-4 + nefes payı — başlık butona yapışmasın, kullanıcı kararı; 6.7 = başlığın
  em-genişliği); buton `text-[clamp(10px,3.1vw,12px)] px-[clamp(8px,2.8vw,12px)]`.
  Küçük ekranda ikisi birden orantılı küçülür, sarma imkânsız.
  Yanında buton olan akışkan başlıklar için bu "kalan-genişlik calc'li clamp" desenini kullan
  (salt-vw clamp buton genişliğini bilemez).
- **Kadro sıralaması:** `TeamRoster.tsx` — useMemo'lu stable sort: kendisi → kaptan →
  yardımcılar → diğerleri (kendisi kaptansa birleşir). captainId fallback'li
  (`myTeam.captainId || myTeam.captain?.id`); yardımcı atama `setMyTeam` ile anında yeniden sıralar.
- **VICE_LIMIT kalıcı modal:** `useMyTeam`'deki 3sn otomatik temizleme efekti
  `successType === 'VICE_LIMIT'` için atlanır (kullanıcı TAMAM ile kapatır); diğer sonuç
  modalları 3sn davranışını korur.
- Doğrulama: tsc (yalnız ön-var-olan LocationStep) + vite build + cap copy (ios+android) ✓.

## 54. Müşteri login: premium "gece halısahası" yeniden tasarımı (2026-07-07)

> Round 1 (ambiyans SVG + süzülen benekler + el-yapımı dönen-top Lottie `soccer-ball-spin.json`
> + buton `btn-shine` + logo `pulse-glow` hale) kullanıcı geri bildirimiyle "dandik" bulunup
> **TAMAMEN GERİ ALINDI/SİLİNDİ** (AuthAmbient.tsx, LoginBallAccent.tsx, soccer-ball-spin.json
> silindi; İşletme login birebir orijinaline döndü — pitch YALNIZ müşteri login'inde).
> Kararlar (AskUserQuestion): **koyu gece sahası** (zümrüt→siyah radyal + floodlight + vignette)
> + **floodlit tebeşir** çizgiler. Amaç: uygulama içi premium navbar seviyesi.

### DOM-çapalı saha (tüm cihazlarda hizalı — KALICI desen)
- **Neden tek arka-plan SVG DEĞİL:** `preserveAspectRatio slice` farklı en-boy oranlarında logo/
  buton hizasını kaydırır. Bunun yerine her saha işareti **çerçevelediği DOM öğesinin içine**
  çapalanır → orta çember her ekranda logoyla, ceza sahası butonla ortalı kalır.
- **`components/UI/PitchCenterCircle.tsx`** (logo sarmalayıcısında `absolute inset-0`, img'den
  önce/arkada): orta çember (`<circle>` stroke-draw, logo kutusunun %92'si → **icon.png'yi içine
  alır**) + orta nokta + **tam viewport-genişliği orta çizgi** (`left:50%; margin-left:-50vw;
  width:100vw`; dikey `top:calc(50% - 1px)` — transform çakışmasız; `.pitch-line-h` = `scaleX(0→1)`
  merkez-kaynaklı). Logo `relative z-10`, çember `z-0` → çizgi logonun ARKASINDAN geçer.
- **`components/UI/PitchGoalArea.tsx`** (footer'da `absolute inset-x-0 bottom-0`, butonun
  arkasında): ceza sahası ⊓ + penaltı yayı + penaltı noktası. `viewBox 0 0 300 120` +
  `preserveAspectRatio="none"` + **`vectorEffect="non-scaling-stroke"`** → her oranda düzgün 2px
  çizgi. Kutu `x 10..290` (neredeyse tam genişlik) → tam-genişlik butonu içine alır (buton
  `relative z-10`). Touchline YOK (kenarda çift-çizgi/kalabalık yapmasın; kullanıcının beğendiği
  sadeliğe uygun).

### Zemin & stil
- Kök `fixed` div: `radial-gradient(125% 78% at 50% 24%, #16402f, #0d2419, #061710, #040f0a)`
  (üst-merkez floodlight, kenar vignette). Ayrı `absolute inset-0` katman = çok düşük opak dikey
  **çim biçme şeritleri** (`repeating-linear-gradient` %1.8 beyaz).
- **Floodlit tebeşir:** hero (çember + orta çizgi) `rgba(236,247,241,0.66)` + `drop-shadow(0 0 3px
  rgba(200,255,225,0.4))`; ceza sahası `0.4` keskin (glow yok, perf).
- Logo **icon.png** (şeffaf neon-yeşil "halısaha-D"; `dimliLogin.png` KALDIRILDI), boyut
  `clamp(120px,42vw,200px)`, `drop-shadow(0 0 22px rgba(74,222,128,0.35))`.
- **İçerik z-katmanı:** header/form/footer `relative z-10` (pitch `z-0`'ın üstünde) → çizgiler
  input'ların arkasında kalır, okumayı bozmaz.

### Kademeli açılış koreografisi (reduce-motion'da statik son-hâl)
- orta çizgi `0.1s` (scaleX) → çember `0.35s` (stroke) + logo `enter-up 300ms` → ceza sahası
  `0.85s`/yay `1s`/nokta `1.05s` → form `enter-up 360ms` → footer `enter-up 440ms`.
- **Klavye açıkken:** pitch katmanları opaklığı ~%22-28'e düşer (`keyboardOpen` prop) — hizalama
  korunur (logoya/footer'a çapalı), yalnız sönükleşir; input'lar öne çıkar.

### Premium form/buton
- Input: `bg-slate-900/50 border-white/10`, focus `border-turf-500 + shadow-neon-sm`; ikon
  `group-focus-within:text-turf-400`.
- "GİRİŞ YAP": `bg-gradient-to-b from-turf-500 to-turf-600` + yeşil neon gölge (statik; hareketli
  shine YOK). Mevcut dönen-top Lottie loader (`isSubmitting`) korundu (§28 — login'de kalan tek
  Lottie kullanımı).
- "İşletme Hesabına Geçiş Yap": ceza sahası içinde, turuncu marka gradyanı + premium gölge;
  `goToBusiness` flip mantığı dokunulmadı.

### Kalıcı kısıtlar (index.css)
- Login saha animasyonları YALNIZ transform/opacity; tek istisna çember `pitch-draw` (stroke-
  dashoffset, kısa/açılış — dvh yasağı gibi bilinçli, eski-WebView güvenli).
- `.pitch-draw` (çember stroke) + `.pitch-line-h` (orta çizgi scaleX) + `.pitch-wipe-up` (ceza
  sahası clip-path) → `prefers-reduced-motion: reduce`'te statik son-hâl. `dvh/svh` yok; WASM yok.

### Revizyon (2026-07-07, cihaz bulgusu) — KALICI GOTCHA
- **iOS/WebKit: `vectorEffect="non-scaling-stroke"` + `pathLength` + `stroke-dasharray` BİRLİKTE
  bozuk** → stroke-dashoffset çizim tam kapanmaz (çember/kutu kalıcı boşluklu). Round-1 çember +
  ceza sahası bu yüzden eksik çiziliyordu.
  - **Çember çözümü:** pathLength/non-scaling-stroke KALDIR; kanonik daire-draw = inline
    `strokeDasharray/Offset = çevre (2πr)` + `@keyframes pitchDrawClose { to { offset:0 } }` →
    boşluksuz tam daire. (strokeWidth ~1.5; non-scaling-stroke gidince viewBox ölçeğiyle ~2px.)
  - **Ceza sahası çözümü:** dash-draw KALDIR (çizgiler hep komple); uniform çizgi için
    `preserveAspectRatio="none"` + non-scaling-stroke KALIR; giriş = kapsayıcıya `clip-path`
    wipe-up (`pitchWipeUp`) → garantili tam kutu.
- **Logo merkezleme:** `icon.png` görünen "D" çekirdeği canvas'ta dikeyde YUKARIDA (çekirdek
  merkezi y≈%41.5, alt %38 sadece glow; yatay %50 ortada). Çember/orta çizgi/nokta dikey merkezi
  `PitchCenterCircle` `coreCenterY=0.415` ile %41.5'e alındı → D çemberin tam ortasında.
- Doğrulama: PIL kompozisyon önizlemesi (tam daire + D merkezde + komple ceza sahası) + `npm run
  build` (tsc + vite) temiz.

## 55. İşletme fotoğrafı (coverImageUrl) — kayıt + onaylı değişiklik + müşteri kartı (2026-07-08)

### Kavram
- İşletmeye ait 1 kart görseli: `businesses.coverImageUrl` (kolon zaten vardı, bu turda akışlara
  bağlandı; `logoUrl` hâlâ KULLANILMIYOR). Müşteri "Sahalar" listesindeki kapalı kart artık işletme
  fotoğrafını gösterir (`BusinessListItem.tsx` — fallback zinciri: `business.coverImageUrl ||
  displayPitch?.imageUrl || unsplash`); genişletilmiş görünümdeki saha sekmeleri/saha fotoğrafları
  değişmedi.

### Kayıt (Adım 4 — İşletme Detayları)
- `BusinessDetailsStep.tsx`: gizli file input + `ImageCropModal` (16:9) + önizleme/Değiştir/Kaldır.
  İstemcide ZORUNLU (`business.coverImageUrl` step-4 validasyonu, `useBusinessRegister.ts`).
- Submit: işletme fotoğrafı saha fotoğraflarıyla birlikte `/files/upload`'a yüklenir; payload'daki
  `business` nesnesi AÇIK alanlarla kurulur (photoFile File nesnesi sunucuya sızmaz).
- Sunucu DTO'da `coverImageUrl` **@IsOptional** — sahadaki eski mobil binary'ler göndermiyor
  (zorunlu yapılırsa eski sürümden kayıt kırılır); tüm kullanıcılar güncellenince @IsNotEmpty
  yapılabilir. Kayıtta ayrı foto onayı YOK (işletme zaten pending → admin başvuruda görür,
  `BusinessInfoSection.tsx`'te görüntülenir).

### Onaylı değişiklik akışı (saha fotoğrafı akışının genellemesi)
- `pitch_change_requests` GENELLEŞTİRİLDİ: `pitch_id` artık NULLABLE + yeni tip
  `BUSINESS_PHOTO_UPDATE` (pitch_id NULL taşır). **KALICI KISIT: entity'ye Business'a ManyToOne
  EKLEME** — `business_id` varchar, `businesses.id` uuid; synchronize FK üretirken tip
  uyuşmazlığıyla patlar. Admin listesinde işletme adı `businessId` üzerinden toplu lookup ile
  çözülür (`admin-pitch-review.service.getChangeRequests`).
- Endpoint'ler: `POST /businesses/:id/change-requests` `{requestedData:{imageUrl}}` +
  `GET /businesses/:id/change-requests/pending` (`business-change-requests.controller.ts`,
  pitch-change-requests modülünde). Aynı tip bekleyen istek otomatik iptal edilir.
- İşletme paneli: `BusinessInfoSettings` sayfasında "İşletme Fotoğrafı" kartı (pitch-settings foto
  bölümünün aynası: crop → upload → önizleme → "Onay İsteği Gönder" → "İnceleme bekliyor" rozeti).
  `coverImageUrl` hook'ta formData'dan AYRI state'te — `PATCH /businesses/:id` gövdesine karışmaz;
  `UpdateBusinessDto` beyaz listesine coverImageUrl BİLİNÇLİ eklenmedi (onaysız değişiklik kapalı).
- Admin panel: `ChangeRequestsPage` yeni tipi "İşletme Fotoğrafı" etiketiyle gösterir; eski/yeni
  karşılaştırma modalı iki foto tipinde de aynı; pitchName null ise "· —" görünmez.

### KRİTİK: paylaşımlı Cloudinary asset koruması
- Onayda eski görsel artık `safeDestroyCloudinary()` ile silinir (admin-pitch-review.service —
  HEM saha HEM işletme foto dallarında): URL hâlâ herhangi bir `pitches.imageUrl` veya
  `businesses.coverImageUrl`'de geçiyorsa SİLİNMEZ. Neden: seed'de 4 işletmenin cover'ı = 1 no'lu
  saha fotoğrafı (aynı asset) ve işletme aynı görseli hem sahaya hem işletmeye yükleyebilir —
  körlemesine silme diğer kaydın görselini kırardı.

### Tek seferlik canlı DB işlemi (2026-07-08, kullanıcı onayıyla — §9 istisnası)
- Aktif 4 işletmeye (Haliç, Şahin, Seyda, Tepekent) "1 No'lu Saha" fotoğrafı
  `businesses.coverImageUrl`'e kopyalandı (idempotent UPDATE, `coverImageUrl IS NULL` koşullu,
  4 satır). Şema değişikliği (`pitch_id DROP NOT NULL`) deploy'da synchronize ile uygulanacak.

## 56. Silme akışlarında Cloudinary temizliği + merkezi CloudinaryService (2026-07-08)

### Sorun
Foto DEĞİŞTİRİLİRKEN eski görsel Cloudinary'den siliniyordu (client `deleteCloudImage` →
`POST /files/delete-cloud`; admin foto onayında yerel `safeDestroyCloudinary`), ama SİLME
akışlarında (takım silme, hesap silme) logo/avatar Cloudinary'de yetim kalıyordu.

### Merkezi CloudinaryService (`server/src/files/cloudinary.service.ts`, yeni)
Tek Cloudinary erişim noktası: `cloudinary.config()` (files.controller'daki top-level config
buraya taşındı), `extractPublicId(url)` (public_id regex'i artık tek yerde — eskiden files.controller
+ admin-pitch-review'da kopyalıydı), `destroy(url)` (koşulsuz), `safeDestroy(url)` (referans-sayımlı).
- **safeDestroy** URL'yi `team.logoUrl` + `user.avatarUrl` + `businesses.coverImageUrl` +
  `businesses.logoUrl` + `pitches.imageUrl` kolonlarında sayar; toplam 0 ise siler. Paylaşımlı
  görseli (aynı asset birden çok kayıtta) korur.
- `FilesModule` artık `TypeOrmModule.forFeature([Team, User, Business, Pitch])` + CloudinaryService
  provide/export eder. **KALICI: FilesModule hiçbir feature modül import ETMEZ** (yalnız entity) →
  onu import eden Teams/Users/Admin modüllerinde dairesel bağımlılık oluşmaz.

### Eklenen temizlik (KAPSAM: yalnız hard-delete akışlar — kullanıcı kararı)
- **Takım silme** (`teams.service.deleteTeam`): `purgeTeam` COMMIT'inden SONRA
  `cloudinaryService.safeDestroy(team.logoUrl)`. `purgeTeam` saf DB temizliği kalır (users.service
  `purgeTeamRaw` kopyasıyla senkron).
- **Hesap silme** (`users.service.deleteAccount`): tüm DB silme adımlarından SONRA
  `safeDestroy(user.avatarUrl)`; kullanıcı tek üyeli takım kaptanıysa purge edilen takımın
  `logoUrl`'i purge ÖNCESİ yakalanıp o da `safeDestroy` edilir.
- **Neden silme SONRASI:** silinen kaydın kendi referansı sayıma girmesin (0 → silinir) + transaction
  rollback olursa (aktif maç engeli/FK) resim yanlışlıkla silinmesin. Hatalar yutulur (best-effort).
- **DRY:** admin-pitch-review'daki yerel `safeDestroyCloudinary` kaldırıldı → merkezi
  `cloudinaryService.safeDestroy` (AdminModule → FilesModule). Foto onayı davranışı en az eskisi
  kadar korumalı (artık team/user kolonlarına da bakar).

### KAPSAM DIŞI (bilerek)
- **İşletme/saha soft-delete** (`business-owner.service.deleteAccount` işletmeyi `deletedAt` ile
  arşivler, admin `restoreBusiness` ile geri yükler; `pitches.remove` de soft-delete) resimleri
  KORUNUR — restore edilince görsel sağlam kalsın. İleride admin "arşivden kalıcı sil" eklenirse
  temizlik oraya bağlanmalı.
- **Geçmiş yetim Cloudinary dosyaları:** team/user hard-delete olduğundan geçmişte silinmiş
  kayıtların asset'leri DB'den türetilemez; bu düzeltme yalnız bundan sonrası için önleme sağlar.

---

## 57. İşletme/saha silince bekleyen "onay bekliyor" + "rakip aranıyor" iptali & bildirim (2026-07-08)

> Boşluk: işletme sahibi hesabını silince (`deleteAccount`) veya bir saha kaldırılınca
> (`pitches.remove`; plan küçültme saha-seçimi de bunu çağırır) o saha(lar)a bağlı **bekleyen**
> `Reservation` (PENDING = "onay bekliyor") ve **PENDING `MatchAnnouncement`** ("rakip aranıyor")
> öksüz kalıyordu — ilan Maç Pazarı JOIN'inden (`b.deletedAt IS NULL`) sessizce düşüyor ama takıma
> **bildirim gitmiyordu**; `kendi_aramizda` sohbeti + "onay bekleniyor" durumu boşuna asılıydı.
> "Kesinleşmiş (APPROVED) maç varsa silinemez" kontrolü zaten vardı (deleteAccount: ileri tarihli
> APPROVED sayımı; pitches.remove: `getFutureApprovedConflicts` → 409) — bu akış onun **altındaki**
> bekleyen durumları temizler.

### Çözüm — ortak yardımcı `cancelPendingForPitches`
- `reservation-lifecycle.service.ts` `cancelPendingForPitches(pitchIds, ctx, manager)` (facade
  `reservations.service.ts` üzerinden dışa açık). Mevcut `approve()` iptal+bildirim deseninin
  (§sekmesi: rakip PENDING rezervasyon→REJECTED + `rakip_araniyor`→CANCELLED) silme'ye genellemesi.
- **Yalnız GELECEKTEKİ** kayıtlar (rez. `slotTime >= now`; ilan İstanbul date+time >= now —
  geçmişi cron zaten EXPIRED yapıyor). Durum geçişleri **toplu** `update(In(ids))`, `manager` ile
  transaction içinde; bildirimler `notificationsService.create` (approve() gibi best-effort).
- Rezervasyon → `CANCELLED`; MATCH_GROUP varsa `support.sendSystemMessage(skipPush=true)` + öksüz
  joker için `support.cleanupJokersOnMatchCancel`; iki takımın oyuncularına (dedup) bildirim.
- İlan → `CANCELLED`; kaptan+oyunculara bildirim. `kendi_aramizda` ilanı 1. adımda rezervasyonuyla
  ele alındıysa **tekrar bildirim yok** (`handledAnnouncementIds` guard), yalnız durum geçişi.
- Tarih/saat: `istanbulDisplayParts` (agent.md §29 — çıplak `toLocale*` yasak).

### Bağlama + bildirim
- `deleteAccount`: sahalar soft-delete edilmeden ÖNCE, `queryRunner.manager` ile
  `scope:'BUSINESS_CLOSED'`. `pitches.remove`: soft-delete öncesi kendi transaction'ında
  `scope:'PITCH_REMOVED'` (+ `pitchNameById`). `PitchesService` artık `ReservationsService` inject
  ediyor → **`PitchesModule` `ReservationsModule` import eder** (döngü yok: ReservationsModule
  Pitches'i import etmiyor).
- Yeni `metadata.type`: **`BUSINESS_CLOSED` / `PITCH_REMOVED`** → `notifications.service.ts`
  `userSystemPushTypes` whitelist'ine eklendi (SYSTEM bildirimi FCM push da gider). Metin: detaylı +
  yönlendirici ("{işletme}/{saha} kapandığı/kaldırıldığı için {tarih saat} … Yakındaki diğer sahalara
  göz atabilirsiniz."). `notification.entity.ts` union DEĞİŞMEDİ (SYSTEM + metadata.type serbest).

### ⏳ Restore (geri yükleme) — AÇIK eksikler (bu turda YALNIZ raporlandı, kod yok)
- Geri yükleme yalnız **admin** (`admin-business.service.restoreBusiness`, işletme + TÜM sahaları
  un-soft-delete). **Owner self-restore YOK**; **tek-saha restore yolu HİÇ YOK** (owner da admin de
  `remove` edilen tek sahayı geri alamaz). Owner self-delete ettiyse owner+abonelik hard-delete →
  restore edilen işletme müşteriye görünmez + yeniden kayıtta **çift-kayıt riski**. İptal edilen
  bekleyen kayıtlar restore'da geri gelmez (zaman-duyarlı, kabul edilebilir). → ayrı tur.

---

## 58. Takımım modalları revizyonu + veri çekme denetimi (2026-07-08)

### Modal düzeltmeleri (`client/pages/customer/MyTeam/components/`)
- **Kapatma butonu 3 modalda (Geçmiş/İstekler/Yaklaşan) basılamıyordu — kök neden z-index:**
  başlık satırı da `z-10` ve DOM'da butondan SONRA geldiği için butonun büyük bölümünü örtüp
  dokunuşları yutuyordu. Çözüm: buton `z-20` + `p-3` (48×48 hit area). Bu header deseninde yeni
  buton eklerken başlık katmanının üstünde kalmasına dikkat.
- **RatingModal `MatchHistoryModal` backdrop'unun İÇİNE render ediliyordu** → yıldıza her dokunuş
  backdrop `onClick={onClose}`'a kabarcıklanıp geçmiş maçlar modalını kapatıyordu (puanlama
  imkânsızdı). Çözüm: portal fragment'ında **kardeş** katman olarak render. Kural: tam-ekran alt
  modal, backdrop-tıkla-kapan bir üst modalın çocuğu OLMAMALI (ya kardeş ya `stopPropagation`).
- Geçmiş maç kartı kompaktlaştırıldı: durum tam-genişlik üst çubuğa taşındı ("Değerlendirildi"
  taşması bitti — dar ekranda sığmayan sağ rozet deseni yerine bar + `truncate`), puanlar barda
  mini rozet (5 yıldız satırı kalktı), bilgiler tek `divide-y` konteynerde, fontlar `clamp()`.
- Takım İstekleri kartı: takım adı + durum pill'i aynı satıra alındı, boşluklar sıkıldı.
  Dış "Takım İstekleri" butonu turuncudan laciverte (`from-blue-600 to-indigo-700`) çevrildi —
  modal içi mavi tonlarla tutarlılık (turuncu = işletme tarafı rengiyle karışıyordu gerekçesi
  artık geçersiz).

### Veri çekme denetimi (rapor: `docs/takimim-veri-cekme-raporu.md`)
- Uygulanan: `useMyTeam.fetchUser`'dan **kullanılmayan `getPitches()`** ve **çift `GET
  /ratings/history`** (modal zaten her açılışta çekiyor) kaldırıldı → açılış 4 → 2 istek.
- Açık aksiyonlar (öncelikli): `/ratings/history` LİMİTSİZ (sayfalama şart, en kritik);
  `teams.findOne` oyuncuları 2 kez sorguluyor + üretimde `console.log`; `/reservations/upcoming`
  tüm `timeSlots`'u join'liyor (bitiş = başlangıç+1sa, `addOneHour` yeter); ev sahibi saha kartı
  tüm yarıçap listesinden besleniyor (tekil `GET /businesses/:id` + edit-modunda lazy liste;
  ayrıca ev işletmesi yarıçap dışındaysa kart yanlışlıkla "İşletme Seç" gösteriyor).

---

## 59. Takımım ölçeklenebilirlik turu: 4 öncelikli aksiyon uygulandı (2026-07-08)

`docs/takimim-veri-cekme-raporu.md` P1/P2 aksiyonlarının tamamı + `findAll` bonus'u.
**Geriye uyumluluk ilkesi:** sahadaki kurulu sürümler bozulmaz — sunucu önce deploy edilir.

### A1 — `teams.service.ts` findOne/findAll (sunucu)
- Ortak `loadTeamPlayers(teamId)`: oyuncular TEK sorgu, **dar select** (User kolonları eksi
  SENSITIVE_USER_FIELDS — hassas kolonlar DB'den hiç çekilmez), `user.team` join'i YOK →
  `players[].team` (oyuncu başına gömülü tam takım nesnesi) payload'dan kalktı (tüketicisi
  yoktu; skaler `teamId` duruyor; kullanıcı onayı alındı). `findOne`'daki çift oyuncu
  yüklemesi (relations + QueryBuilder) teke indi; üretim `console.log`'u silindi.
  `sanitizeUser` savunma katmanı olarak duruyor.

### A2 — `GET /ratings/history` sayfalama (sunucu+client)
- **Sözleşme:** `limit` param YOKSA eski düz dizi (eski client'lar); VARSA
  `{items,total,hasMore}` (business paged zarfı; cap 1-50, default 20).
- `ratings.service.ts`: `fetchMatchHistoryPage` çekirdeği — QueryBuilder
  `(teamId OR opponentTeamId) AND APPROVED AND slotTime<now`, `ORDER BY slotTime DESC`,
  paged yolda `take/skip + getManyAndCount`. JS dedup + JS sort SİLİNDİ (tek OR sorgusu
  duplikat üretemez; sıralama SQL'de).
- `reservation.entity.ts`: **`@Index(['opponentTeamId','status'])`** eklendi (OR'un ikinci
  kolu indekssizdi — canlı DB'de doğrulandı). synchronize boot'ta kurar (CONCURRENTLY değil,
  kısa yazma kilidi — mevcut boyutta önemsiz).
- Client: `api.ts getMatchHistoryPaged` (eski sunucuda düz-dizi fallback'i),
  `useMyTeam` birikmeli sayfa state'i (gen/fetching ref guard'ları usePitchBooking deseni),
  MatchHistoryModal sonsuz kaydırma (<600px eşiği) + başlık `total` (artık dizi uzunluğu değil).
  **`applyRatingResult` hook'ta** — puanlamanın optimistic güncellemesi birikmeli listede
  yaşar; modal-lokal state kaldırıldı (sayfa append'i güncellemeyi silemiyordu bug'ı önlendi).

### A3 — `/reservations/upcoming` timeSlots join'i kalktı (sunucu+client)
- `reservation-query.service.ts findUpcomingByTeam`: `pitch.timeSlots` join'i yerine getMany
  sonrası TEK `timeSlotRepository.find({pitchId: In(...)})` + İstanbul "HH:mm" eşlemesi
  (`istanbulDisplayParts`, §29). Yanıtta: `pitch.timeSlots = [eşleşen] | []` (ESKİ client'ın
  `.find()`'ı çalışmaya devam eder) + **üst-düzey `endTime: string|null`** (yeni client).
- ⚠️ **+1 saat VARSAYMA:** canlı DB'de 2 saatlik (12:00→14:00) ve gece-aşan (23:00→00:00)
  slotlar var. Lokal testte 2sa slot → endTime 07:00 (06:00 değil) doğrulandı.
- Client `UpcomingMatchesModal`: `match.endTime ?? timeSlots-lookup ?? addOneHour` zinciri.
- `reservations.module.ts`'e `TimeSlot` forFeature eklendi.

### A4 — Ev sahibi işletme kartı (yalnız client)
- Kart artık `getBusinesses({ids:[homeBusinessId]})` tekil fetch'i (TeamDetailModal deseni,
  yeni endpoint yok); **yarıçap listesi yalnız "Değiştir" (isEditingPitch) modunda** lazy
  çekiliyor (`isBusinessListLoading` spinner'ı ile). BUG FIX: ev işletmesi seçili yarıçapın
  dışındaysa kart yanlışlıkla "İşletme Seç" gösteriyordu. Offline: `TEAM_CACHE_KEY` zarfına
  opsiyonel `homeBusiness` anahtarı eklendi (fetchUser yazarken zarfı spread'le korur).

### Doğrulama (lokal dev sunucu :3919, lokal dev DB — canlıya YAZILMADI)
- Legacy history düz dizi + DESC; limit=2/offset sayfaları çakışmasız, total/hasMore doğru;
  limit cap çalışıyor. /teams/:id: hassas alan yok, players[].team yok, playedMatchCount var.
  upcoming: timeSlots 0/1 elemanlı, endTime gece-aşan ve 2sa slotta doğru. businesses?ids OK.
  server build + client tsc/build temiz. Test satırları lokal DB'den geri silindi.

### Açık kalanlar (rapor P3): modal verilerine kısa-TTL cache; users/me→teams/:id waterfall.

---

## 60. Plan düşürme yeniden tasarımı: ertelenmiş saha silme (scheduledDeletionAt) + Seyda veri onarımı (2026-07-09)

### Olay ve kök nedenler (canlı DB ile doğrulandı)
- Seyda Halı Saha, Basic→Starter düşürmede "2 Nolu Saha"yı seçti, onay modalında **Vazgeç**'e
  bastı; saha yine de soft-delete edildi. **Kök neden 1:** eski akışta saha seçim modalının
  onayı doğrudan `DELETE /pitches/:id` çağırıyordu — satın alma/schedule SONRAKİ modaldaydı,
  iptalde geri alma yoktu. **Kök neden 2:** `business-owner.service.findOne` pitches ilişkisini
  `deletedAt` filtresiz yüklüyordu → panelde işlem yapılamayan hayalet "SAHA KAPALI" sekmesi
  (her aksiyon `assertPitchOwnedBy`'da 404 → "Güncelleme başarısız oldu").
- **Tek seferlik canlı işlem (kullanıcı onaylı, §9 istisnası):** eski saha restore edildi
  (`deletedAt=NULL, isActive=true` — geçmişi/onayı korundu), kullanıcının açtığı referanssız
  kopya "2 Nolu Saha" hard-delete edildi. Not: sahanın saat slotları olaydan önce de boştu —
  işletme slotları yeniden girmeli.

### Yeni mimari — ertelenmiş silme (KALICI)
- `pitches.scheduledDeletionAt` + `deletionReminderSentAt` (nullable timestamp; synchronize).
- **Akış (yeni client):** PlanPicker → PitchSelection onayı = `POST /pitches/downgrade-precheck`
  (**yan etkisiz** doğrulama: adet, sahiplik, X-sonrası `teamId IS NOT NULL` APPROVED çakışma →
  409 `{message:'Kesinleşmiş maçlar var', pitchId, conflicts}`) → DowngradeConfirm onayı =
  RevenueCat purchase → `POST /pitches/schedule-downgrade {planType, rcCustomerId, pitchIds}`.
  Vazgeç her adımda gerçekten yan etkisiz. 409'da satın alma korunur (`downgradePurchaseRef`),
  saha seçimi yeniden açılır — tekrar satın alma istenmez.
- **`PitchDowngradeService` (server/src/pitches/pitch-downgrade.service.ts):** schedule tek
  transaction (subscription satırına pessimistic kilit): seçili sahalar `isActive=false` +
  `scheduledDeletionAt=X` (X = `expiresAt ?? trialEndsAt`; soft-delete YOK), önceki planlamadaki
  seçilmemiş sahalar sıfırlanıp geri aktif edilir, `cancelPendingForPitches(fromTime=X,
  scope:'PITCH_SCHEDULED_OFFLINE')` yalnız X-sonrası PENDING'leri iptal eder,
  `SubscriptionService.scheduleDowngrade(manager)` pending alanları yazar. Owner X'e kadar
  mevcut toggle ile sahayı geri açıp rezervasyon alabilir.
- **Guard'lar:** `reservation-lifecycle.create()` + `match-announcements.create()` →
  `slotTime >= scheduledDeletionAt` ise 409 `{code:'PITCH_SCHEDULED_OFFLINE', effectiveAt}`
  (tarih `istanbulDisplayParts`). Üç rezervasyon üreticisi de (controller, kendi_aramizda,
  challenge kabul) tek noktadan kapsanır.
- **Saatlik cron `pitch_scheduled_deletions`:** vadesi gelen sahayı kendi transaction'ında
  (pitch satırı kilitli + vade re-check; ⚠️ eager timeSlots yüzünden kilitli okuma QueryBuilder
  ile — findOne+FOR UPDATE join'de patlar) siler: takımsız APPROVED bloklar iptal,
  `RecurringClosure.isActive=false` (3AM top-up ölü sahaya slot üretmesin),
  `cancelPendingForPitches(PITCH_REMOVED)`, soft-delete, owner'a `PITCH_DELETED`. **Emniyet
  ağı:** geçerli plan (vadesi gelen pending dahil) sahayı hâlâ kapsıyorsa silme atlanır,
  planlama temizlenir. Hatırlatma: X'e ≤72sa kala tek seferlik `PITCH_DELETION_REMINDER`.
- **Yükseltme:** `confirmPurchase` (iki dal) `clearScheduledPitchDeletions` çağırır — koşullu
  UPDATE (cron yarışına atomik) + saha geri aktif + `PITCH_DELETION_CANCELLED` (modül döngüsü
  nedeniyle Notification repo insert'i; push yok — bilinçli). Webhook RENEWAL temizlemez.
- **Modül kuralı (KALICI):** SubscriptionModule YAPRAK kalır (Reservations onu import ediyor);
  orkestrasyon PitchesModule'de (Notifications+Subscription importu döngüsüz). Subscription
  yalnız entity forFeature aldı (Pitch/BusinessOwner/Notification).
- **Bildirim tipleri:** `businessPushTypes` + entity union'a `PITCH_DELETION_SCHEDULED/
  REMINDER/PITCH_DELETED/PITCH_DELETION_CANCELLED`; `userSystemPushTypes`'a
  `PITCH_SCHEDULED_OFFLINE` eklendi.
- **Client:** owner — PitchGrid PASSIVE dalında "X'te silinecek" metni + aktif sahada amber
  bant; PendingDowngradeBanner silinecek saha adlarını sayar. Müşteri — PitchSchedule'da amber
  bant + X-sonrası slotlar "HİZMET DIŞI" (İstanbul: `new Date(\`${date}T${time}:00+03:00\`)`),
  CreateMatchModal'da ön-engel + buton disable; sunucu 409'u mevcut mesaj yoluyla gösterilir.
- **Geriye uyumluluk (kabul edilen sınırlama):** eski owner build'leri düşürmede hâlâ doğrudan
  `DELETE /pitches/:id` çağırır (anında soft-delete) — sunucu meşru tekil silmeden ayırt edemez;
  yeni sürüm yayılana kadar sürer. `/subscription/schedule-downgrade` bayt-bayt aynı bırakıldı.

### Doğrulama (lokal :3921 + lokal DB; canlıya yalnız Faz-0 onarımı yazıldı)
- precheck: mutlu yol / yanlış adet 400 / düşürme-değil 400 / yabancı saha 404 / auth 401 /
  X-sonrası takımlı APPROVED 409 (X-öncesi APPROVED ve X-sonrası takımsız blok veto ETMEZ) ✓
- schedule: pitch pasif+X, pending alanlar, X-sonrası PENDING iptal, X-öncesi dokunulmadı ✓
- toggle ile geri açma; X-öncesi rezervasyon OLUŞTU, X-sonrası rezervasyon+ilan 409
  `PITCH_SCHEDULED_OFFLINE` ✓; hatırlatma tek seferlik ✓; emniyet ağı (plan kapsıyorsa silme
  yerine temizlik) ✓; tam silme simülasyonu (soft-delete+iptaller+bildirimler) ✓; yükseltme
  temizliği + `PITCH_DELETION_CANCELLED` ✓; hayalet düzeltmesi (findOne silinmişleri dışlar) ✓;
  TZ=UTC parite: vadesi gelen pending plan okumada uygulandı ✓. Test satırları geri silindi.
- ⚠️ **Lokal test TZ gotcha'sı:** lokal Postgres `Europe/Istanbul` — ham SQL'de `NOW()` naive
  kolona İstanbul duvar saati yazar, uygulama UTC okur → sahte kaymalar. Lokal test SQL'inde
  `(NOW() AT TIME ZONE 'UTC')` kullan. Üretimde süreç+DB UTC, sorun yok (§29).

---

## 61. İşletme paneli ölçeklenebilirlik — Faz 1 (2026-07-09)

> Hedef: 50 işletme toplu yayın öncesi işletme (business owner) panelinin veri-çekme mimarisini
> incele + ölçeklenebilir yap. Kullanıcı onaylı **aşamalı** kapsam: Faz 1 = düşük riskli, geriye
> uyumlu düzeltmeler (burası). Faz 2 (dashboard slot payload hafifletme + per-saha N+1) AYRI onay
> bekliyor. Rapor+plan: `~/.claude/plans/i-letme-panel-ve-i-letme-async-goose.md`.

### Tespit (mevcut durum, 3 Explore ajanı + canlı DB salt-SELECT)
- **Ekran istekleri:** Dashboard=4 (dashboard+subscription+preset-notes+unread-count), Stats=1,
  Bildirimler=1, Saha ayarları=saha başına 4 (zaten lazy). **Polling YOK.** Yükleyici=rolling-football.
- **Darboğazlar:** (1) `findByOwner` bildirim **sınırsız** tüm-geçmiş + N+1 self-heal (§49'da ertelenmişti);
  (2) `getStats` **saha başına 4 COUNT** (4N round-trip); (3) dashboard per-saha N+1 + her slota tam
  Reservation grafiği (→Faz 2); (4) `reservation` indeks boşlukları (`status`, `recurringClosureId`,
  `matchAnnouncementId`). Canlı ölçek küçük (6 işl/8 saha/134 rez/290 bildirim) ama sınırsız desenler büyür.

### Faz 1 — yapıldı (hepsi geriye uyumlu; **önce sunucu deploy**)
- **B1 — İşletme bildirim sayfalama** (müşteri `findByUser` deseninin aynası): `notifications.service
  findByOwner` **overload** — opts yoksa legacy düz dizi (eski client kırılmaz), varsa `take:limit+1`
  + `count` → `{items,total,hasMore}`. Self-heal ayrı private `enrichReservationRequestNotifications`'a
  çıkarıldı → sayfalı yolda yalnız **sayfa dilimine** (≤limit) uygulanır. `business-owner.controller`
  `getNotifications` limit/offset (clamp 1..50, default 20). Client: `api.ts getBusinessNotificationsPaged`
  (eski-sunucu düz-dizi fallback'i) + `BusinessNotificationsPage` **sonsuz kaydırma** (PAGE_SIZE=20,
  fetchGen nesil guard + id-dedup append + ~600px eşik, alt spinner rolling-football).
- **B2 — Stats 4N COUNT → tek sorgu:** `getStats` saha döngüsündeki 4 count → **tek QueryBuilder**:
  `WHERE pitchId IN(...) AND status=APPROVED AND slotTime BETWEEN ay`, `SELECT pitchId, (teamId IS NULL)
  isManual, COUNT(*) monthCnt, COUNT(*) FILTER (WHERE slotTime BETWEEN bugün) todayCnt`, `GROUP BY pitchId,
  (teamId IS NULL)` (parametresiz GROUP BY — güvenli). JS'te saha kovalarına indirilir; **çıktı şekli
  birebir korunur**. **İNCELİK:** `getStats:415` ikinci business yüklemesi KASITLI (Pitch `deletedAt` düz
  `@Column`, DeleteDateColumn değil → soft-delete sahaları da yükler = tarihsel gelir); pitch kümesine
  DOKUNULMADI. Golden-diff (canlı DB, 8 saha) eski 4-count == yeni GROUP BY **birebir** (`ok=t`).
- **B3 — Dashboard gereksiz istek temizliği** (`useBusinessDashboard`): preset-notes **lazy** (mount
  yerine not modalı ilk açılınca, `presetNotesLoadedRef`); subscription **tarih değişiminde çekilmez**
  (`needSub = !subscriptionLoadedRef.current || silent` → yalnız ilk yükleme + reconnect/resubmit;
  mutasyon sonrası da atlanır). Cache yazımı `subscriptionRef.current` (en güncel) ile korunur.
- **B4 — Eksik indeksler** (`reservation.entity`, synchronize boot'ta kurar): `@Index(['pitchId','status',
  'slotTime'])` (stats), `@Index(['recurringClosureId'])`, `@Index(['matchAnnouncementId'])`. Canlı DB'de
  bu kolonların indekssiz olduğu doğrulandı. Dashboard gün sorgusu mevcut `[pitchId,slotTime]`'dan okumaya devam.

### Doğrulama
Server `npm run build` + lint (edit'lenen 4 dosya temiz). Client `tsc --noEmit` (yalnız önceden var olan
`LocationStep window.google`) + `vite build` ✓. Stats golden-diff canlı DB'de birebir; yeni `COUNT FILTER`
SQL yapısı canlıda çalıştırıldı (Seyda: ay 5/20, bugün 0/2). **Deploy sırası: sunucu → client.**

### Faz 2 (ertelendi, AYRI onay) + kalan aday-görevler
- Faz 2: dashboard slot payload hafifletme (grid yalnız durum; SlotDetailModal slot rezervasyonlarını lazy
  çeksin) + per-saha N+1'i `pitchId IN(...)` + gün aralığına indir (§27 parity kuralı). Booking grid çekirdek → golden-diff.
- Kalan: pitch `deletedAt` / business `status`,`deletedAt` indeksleri (müşteri geo yolu, ayrı tur);
  notification partial `read` indeksi (unread düşük hacim → düşük öncelik); `GET /reservations` findAll
  filtresiz tüm-tablo (işletme paneli çağırmıyor ama genel landmine).

---

## 62. İşletme paneli: Saha Ayarları başlık standardizasyonu + silme onayı + Yetkili Bilgileri sayfası (2026-07-10)

> Üç iş bir turda (client mobil + server). Client `tsc --noEmit` (yalnız önceden var olan
> `LocationStep window.google`) + `vite build` ✓; server `nest build` + lint ✓.

### A. Saha Ayarları başlık deseni birleştirildi (yalnız client)
- **Sorun:** `BusinessPitchList` + `BusinessPitchSettings` başlıkları "kompakt/sport" deseni (linear
  gradyan, `font-sport`, `p-2.5` düz ikon) kullanırken diğer 4 ayar alt sayfası "premium glow" deseni
  (radyal gradyan, `CorporateGridBackground`, `w-11` parlayan ikon kutusu, `w-10` backdrop-blur geri
  butonu, `font-black clamp(18px,5vw,22px)`) kullanıyordu (bkz. `InfoSettingsHeader.tsx` referans).
- **Fix:** `PitchListHeader.tsx` + `PitchSettingsHeader.tsx` → Pattern A. `sticky top-0` konumlandırma
  KORUNDU (ikisi de `flex flex-col overflow-hidden` konteynerde header = scroll'un ÜSTÜNDE kardeş →
  `shrink-0`). Liste başlığındaki sağ **mor plan rozeti** (`BASIC`/`Starter`…) korundu.
- **KALICI KURAL:** yeni işletme ayar alt sayfaları bu Pattern A başlığını kullanır (radyal gradyan +
  `CorporateGridBackground` + parlayan ikon kutusu). Feature-bazlı aksan rengi serbest (Hazır Notlar
  indigo, yeni Yetkili Bilgileri teal); çoğunluk turuncu.

### B. Saat slotu + sürekli kapatma silme onayı (yalnız client)
- Kullanıcı kazara silmeden şikayetçi → paylaşılan `ConfirmModal` (uygulama standardı) ile onay.
- `BusinessPitchSettings.tsx`: `pendingSlotDelete: number|null` + `pendingClosureDelete: string|null`
  sayfa state'i. Alt bölümlere geçen `onRemoveSlot`/`onRemove` artık silmez, "beklet" state'i set eder;
  onay `ConfirmModal`'da verilince `handleRemoveSlot(i)` / `handleRemoveRecurringClosure(id)` çağrılır.
  Alt bileşen imzaları DEĞİŞMEDİ. **Not:** slot silme yerel (kalıcılaşma "Slotları Kaydet" → `PUT
  .../time-slots`); closure silme ANINDA `DELETE /reservations/recurring-closures/:id` → onay kritik.
- Aynı ekrandaki eski `statusConfirm`/`dayConfirm` bespoke onayları DOKUNULMADI (kapsam dışı).
- Hafif cila: "Saat Slotları" + "Sürekli Kapatılan Saatler" bölüm başlıklarına sayaç rozeti eklendi.

### C. Kayıt "Hoş Geldiniz" adımı metinleri (yalnız client)
- `STEP_META[0].subtitle`'daki "ilk 3 ay ücretsiz" (4. kartla çift) kaldırıldı →
  "Sahanı Dimli'ye taşı, süreçlerini kolaylaştır". `WelcomeStep.tsx` `features` sorun-çözen 4 kısa
  karta çevrildi (anlık müsaitlik paylaşımı, tek panel, görünürlük/doluluk, ilk 3 ay ücretsiz).

### D. YENİ: Yetkili Bilgileri sayfası + owner self-update ucu
- **Kavram:** Yetkili = `BusinessOwner` (`fullName`/`email`/`phone`). Telefon SALT-OKUNUR (OTP-doğrulanmış +
  benzersizlik kilidi); ad soyad + e-posta düzenlenebilir. E-posta = panel GİRİŞ kimliği.
- **Server (YENİ uç):** `PATCH /business-owner/profile` (`@UseGuards(JwtAuthGuard)`, owner=`req.user.id`)
  → `UpdateBusinessOwnerProfileDto` (`fullName?`,`email?` beyaz-liste; **phone yok**) →
  `BusinessOwnerService.updateProfile`: e-posta değişiyorsa `findByEmail` ile benzersizlik
  (`ConflictException` "Bu e-posta zaten kullanımda."), **parola HARİÇ** sanitize dönüş
  `{id,fullName,email,phone}`. E-posta case-sensitivity mevcut sistemin borcu (exact-match, kayıtla tutarlı).
  E-posta değişse bile JWT geçerli (`sub`=owner.id sabit) → yeniden giriş gerekmez.
- **Client (YENİ sayfa):** `client/pages/business/BusinessOwnerProfileSettings/` (page+hook+
  `OwnerProfileHeader` teal Pattern A + `OwnerProfileForm`). Okuma mevcut `GET /business-owner/:id`
  (fullName/email/phone zaten döner) → yeni okuma ucu YOK. Telefon `formatTurkishPhoneDisplay` ile
  `0 (5XX) ...` gösterilir (sunucu `905…` saklar → `'0'+slice(2)` ile 11-haneye çevir). Kaydet →
  `ConfirmModal` onayı → `PATCH /business-owner/profile`; 409 e-posta hatası ilgili alana basılır.
- **Bağlama:** `BusinessSettingsHub` menüsüne teal `UserCog` kartı ("Yetkili Bilgileri",
  `/business/settings/authorized`, İşletme Bilgileri'nin hemen ardında); `App.tsx` lazy import + rota.
- ⚠️ **Güvenlik borcu (takip):** `GET /business-owner/:id` HÂLÂ guard'sız ve `findOne` **parola hash'ini**
  döndürüyor (`business-owner.controller.ts:110`, `service:131`). Bu tur kapsam dışı bırakıldı (mevcut
  InfoSettings de bu ucu kullanıyor); guard'lı+sanitize okuma ucu ayrı adımda eklenebilir.

### Deploy
**Sıra: önce server (Render) → sonra client (yeni native sürüm).** Server ucu eski client'ları bozmaz;
Yetkili sayfası yeni client sürümüyle görünür. `synchronize:true` — şema değişmedi (mevcut kolonlar).

## 63. Açılış animasyonu: AnimatedSplash "perde" mimarisi + /pitches inişi (2026-07-10)

Getir/YemekSepeti tarzı markalı açılış: her soğuk açılışta SVG+CSS "DİMLİ" çizim animasyonu
(`client/components/UI/AnimatedSplash.tsx`), ardından oturum durumuna göre yönlendirme. Kaynak tasarım
kullanıcının Claude Design çıktısı `DIMLI Splash.html` (repo kökü, git dışı) — SVG path/zamanlama verileri
birebir taşındı ve programatik diff ile doğrulandı.

- **Perde mimarisi:** `AnimatedSplash`, `App()` içinde provider ağacının KARDEŞİ (`fixed inset-0 z-[9999]`
  opak lacivert). Arkasında uygulama boot olur (auth restore ~100ms, guard'lar, lazy chunk'lar); süre
  dolunca perde solar → unmount → hedef ekran zaten boyalı. `bootSplashDone` state JS oturumu boyunca
  yaşar → arka plan/ön plan geçişinde TEKRARLAMAZ; OS öldürürse yeni JS bağlamı → tekrar oynar.
- **Süre:** ilk açılış ~4.4sn (`SPEED=0.75`), sonrakiler ~2.6sn (`SPEED=0.45`) — taban çizelge 5.85sn.
  Bayrak `localStorage 'dimli_splash_intro_seen'` — MODÜL SCOPE'ta okunur (StrictMode remount'una bağışık;
  Preferences değil çünkü frame-0'da SENKRON okuma şart; kaybolursa en kötü ilk-açılış temposu tekrar oynar).
  Bitiş `setTimeout` ile — `animationend`'e ASLA bağlanma (reduce-motion güvenliği, CelebrationScreen emsali).
- **NETLİK KURALLARI (kalite turu, 2026-07-10):** splash SVG'sine `filter` (drop-shadow/glow) ve sürekli
  çalışan transform animasyonu EKLENMEZ — WebKit ikisinde de SVG'yi rasterize katmana alıp bulanıklaştırır
  (eski neon glow ×2 ve 5.85sn'lik `splash-settle` scale bu yüzden KALDIRILDI). Çizim yalnız
  `stroke-dashoffset` (paint-level, vektör-keskin). Renk tek sabit: `GREEN='#2f8a22'` (canlı saha yeşili).
- **Login bekletme:** `services/bootSplashStore.ts` (modül store + `useBootSplashDone`,
  `useSyncExternalStore`). AnimatedSplash reveal-start'ta (5.45×SPEED; reduce 0.9sn) `markBootSplashDone()`
  çağırır (finish'te idempotent sigorta). `Login.tsx` splash bitene kadar yalnız zemin degradesi render
  eder → giriş koreografisi (saha çizgileri + enter-up) perde solarken BAŞLAR. Oturumlu akışlar
  (müşteri/işletme) beklemez — sayfa perde arkasında hazır. BusinessLogin'de bekletme yok (soğuk açılışta
  oturumsuz kullanıcı hep /login'e düşer).
- **Boot yolu kuralı (§28 devamı):** AnimatedSplash EAGER import edilir, ASLA lazy/Lottie'ye çevrilmez.
  Keyframe'ler `splash-*` prefix'li (component `<style>` global — index.css `pitchDraw` vb. ile çakışmaz).
- **§54 hatırlatması:** splash path'lerine `vectorEffect="non-scaling-stroke"` EKLEME —
  vectorEffect+pathLength+dasharray üçlüsü iOS/WebKit'te stroke-draw'u kırar; pathLength+dasharray ikilisi güvenli.
- **Wordmark "DİMLİ" = FONT DEĞİL, baked vektör kontur** (`components/UI/splashWordmark.ts` — 5 harf
  path'i + İ nokta reveal daireleri). Neden: tasarımın kalem-maskesi yolları ~360px'e yayılıyordu ama
  Caveat metni doğal dizilimde ~230px — maskeler metne HİÇBİR tarayıcıda hizalı değildi (headless Chrome
  bindirme testiyle kanıtlandı; iOS'ta kırık harf parçaları olarak görünüyordu). Harfler fontkit ile
  Caveat 600 woff2'lerden kontura çevrilip maske merkezlerine (D≈55, İ₁≈130.5, M≈211, L≈291, İ₂≈359.5;
  baseline y=505) yerleştirildi. Caveat @font-face/preload/`public/fonts` TAMAMEN KALDIRILDI (bundle'da
  font yok). Maske ince ayarları: kalem stroke'ları +4 kalınlaştı (24-30), İ nokta reveal daireleri glyph
  noktalarının GERÇEK merkezine taşındı (142.5/371.5, y≈434), Caveat metin-dizilimine özgü `blackout` ve
  `ink dab` yamaları kaldırıldı, yazı fazı sonunda 0.25sn'lik tam-reveal rect eklendi (final kare her
  koşulda eksiksiz). Yeniden üretim scripti: scratchpad `gen-wordmark.cjs` (fontkit; --emit ile yazar).
- **Native splash artık DÜZ LACİVERT (logosuz):** markalı an web animasyonudur. iOS: `LaunchScreen.storyboard`
  düz renk view (Splash.imageset SİLİNDİ — plugin storyboard'u instantiate eder, imageset'i kullanmaz).
  Android: `drawable/splash.xml` (solid `@color/dimliPitch`; plugin isimle "splash" DRAWABLE arar, color
  resource çözemez) + `splash_icon.xml` şeffaf layer-list (Android 12+ ikon slotu zorunlu → şeffaf hile);
  26 `splash.png` + `dimli_splash_icon.png` silindi. `generate-icons.cjs`'ten splash üretimi KALDIRILDI —
  geri ekleme: `splash.png` + `splash.xml` duplicate-resource ile Android build'ini kırar.
- **Config/zamanlama tuzakları:** `capacitor.config.ts` → `launchAutoHide:false`; `launchShowDuration`'ı
  0 YAPMA (plugin 0'da launch splash'ı HİÇ göstermez — SplashScreen.swift `showOnLaunch` erken döner).
  `SplashScreen.hide({fadeOutDuration:200})` AnimatedSplash mount'unda double-rAF + 300ms setTimeout
  yedeğiyle çağrılır (Android 12+ pre-draw hold rAF'ı aç bırakabilir). App.tsx'teki eski hide kaldırıldı.
  Sigorta: `index.tsx` modül scope'ta 8sn'lik yedek hide (JS hatasında native splash'ta takılı kalma).
- **İniş noktaları:** `client/constants/routes.ts` → `CUSTOMER_HOME='/pitches'`. Boot hash'i `index.tsx`
  `replaceState('#/pitches')` (HashRouter'dan ÖNCE; Maç Pazarı boot'ta mount olmaz). Müşteri login/kayıt
  sonrası ve `BusinessProtectedRoute` müşteri-sekmesi de `CUSTOMER_HOME`'a iner; `/` Maç Pazarı navbar
  sekmesi olarak yaşar. Geri tuşu: `#/pitches` yalnız İLK history girişiyse root (App.tsx,
  `history.state.idx===0` — react-router v6/7 iç yapısı).
- **Gelecek — işletme-özel splash:** altyapı hazır: `variant?: 'default'|'business'` prop +
  `getBootSplashVariant()` (senkron `localStorage 'dimli_splash_variant'` okur; auth async olduğundan
  frame-0'da context OKUNAMAZ, ipucu şart). İşletme sanatı eklenince: `loginAsBusiness` key yazar,
  `logout`/`loginAsCustomer` siler, `App()` prop geçirir. Bugün hiçbir yer key yazmıyor.
- **`!isReady` gate'i** artık düz lacivert div (PageLoader boot'tan kaldırıldı; Suspense fallback olarak
  oturum-içi lazy gezinmelerde yaşamaya devam eder).

### Deploy/doğrulama
Salt client değişikliği (server/DB YOK; JWT 365g aynen). `npm run build` + `npx cap sync` yapıldı
(sandbox'ta pod install için `LANG=en_US.UTF-8` gerekti). Kalite turu sonrası final kare + animasyon
ortası headless-Chrome görüntüleriyle doğrulandı; cihaz doğrulaması bekliyor: temiz kurulum ~4.4sn →
ikinci açılış ~2.6sn; oturumsuz → perde solarken login koreografisi başlıyor; müşteri→/pitches,
işletme→/business/dashboard; reduce-motion statik kare; yazının keskin ve glow'suz olduğu görsel kontrol.

## 64. Splash soğuk-başlangıç saat kapısı + işletme login "vitrin-kapı" (2026-07-10)

### A) AnimatedSplash sağlamlaştırma (Redmi 10S kök neden düzeltmesi)
- **Belirti/teşhis:** Redmi'de recents'ten öldürüp soğuk açılışta animasyon hiç görünmüyordu (düz lacivert →
  login); geri tuşuyla çıkış (`exitApp` → ılık süreç) sonrası ÇALIŞIYORDU. Kök neden: CSS animasyon saatleri
  stil uygulandığı anda DUVAR SAATİYLE akar — soğuk süreç açılışında ana iş parçacığı 2-3sn kare üretemezken
  sıkıştırılmış (~2.6sn) çizelge görünmeden tükeniyordu (ilk kurulumun 4.4sn sürümünde kuyruk görünür
  kaldığından "ilk açılış çalışıyor" sanılıyordu; iPhone'da boot ~200ms olduğundan hiç görülmedi).
- **Düzeltme — saat kapısı (`started`):** animasyon stilleri ve reveal/finish zamanlayıcıları İLK GERÇEKTEN
  BOYANAN karede başlar (double-rAF → `setStarted(true)` + native `hide()` aynı karede). `started=false`
  iken tüm öğeler animasyonsuz BAŞLANGIÇ karesinde (gizli), perde animasyonsuz opak. 300ms hide-yedeği
  yalnız native splash içindir (pre-draw kilidini açar → rAF akar → started doğal açılır); 4sn felaket
  sigortası started'ı zorla açar (asla asılı kalmaz).
- **Watchdog:** started'dan 450ms sonra splash KÖK div'inden hiç `animationstart` gelmediyse (dinleyici
  kökte — perde arkası uygulama animasyonları sayılmaz) `forceStatic` → statik son kare. Boş ekran imkânsız.
- **Davranış kararı (kullanıcı):** arka plan/ön plan geçişinde animasyon TEKRARLANMAZ — yalnız soğuk açılış.
  Home/recents-resume'da animasyon olmaması TASARIM GEREĞİDİR, bug değil.

### B) İşletme login "vitrin-kapı" revizyonu
- **Hizalama sistemi (BOZMA):** `BackToCustomerButton` yatay padding `clamp(16px,5vw,32px)` → telefonlarda
  tam %5 = viewBox X=10; bant `clamp(160px,28vh,255px)` + alt padding `clamp(20px,3.5vh,32px)` → her iki
  clamp ucunda %12.5 → buton ALT KENARI her cihazda Y=87.5. Kapı çerçevesi: dikmeler X45/155 (Y56-90),
  lento Y56, zemin Y90; buton genişliği %57.78 (X48..152, margin auto) → ≥3 birim pay, ASLA çakışmaz.
  Bant yükseklik string'i art ve wrapper'da BİREBİR AYNI kalmalı. Buton flex akışında (absolute YAPMA —
  klavye düzeni bozulur); klavye açılınca %100 genişliğe döner (sanat opacity 0).
- **SVG GOTCHA (kalıcı):** tek parçalı YATAY path'lerde (saçak/zemin/lento) objectBoundingBox gradyanı
  SIFIR-YÜKSEKLİK bbox nedeniyle SVG spec gereği HİÇ BOYANMAZ (eski bileşende saçak+zemin bu yüzden hiç
  görünmemişti!). Düzeltme: `linearGradient gradientUnits="userSpaceOnUse" x1=0 x2=200` — tüm cepheye tek
  tutarlı rampa. Gradyan stroke'lu yatay çizgi çizerken hep userSpaceOnUse kullan.
- Yeni dikey düzen: çatı Y0-22 → vitrin saha Y27-44 → tente Y46-52 → kapı Y56-90. Logo diski banda oranlı
  `clamp(36px,18%,48px)` + `zIndex:2` + opak zemin (saçak kesmesin); icon.png glif asimetrisi
  `translate(-49%,-41.5%)` ile disk merkezine oturtuldu. Kapı lambası (amber nokta, 1.95s) + zemin ışıması
  (2s) `.sfa-fade` (inline animation yerine sınıf — reduced-motion medya sorgusu ezebilsin diye);
  `@media (prefers-reduced-motion: reduce)` bloğu eklendi (anim-line dashoffset:0, fade'ler opacity:1).
- Premium: submit CTA müşteri diliyle `linear-gradient(135deg,#ea580c,#9a3412)` + rounded-2xl; başlık
  beyaz→amber text-clip parıltısı; kapı kanadı gri dikey gradyan + `16px 16px 10px 10px` radius.
- Doğrulama: headless Chrome, bant min (320×568) + max (430×932) — kapı çerçevesi/buton hizası, saçak +
  zemin çizgilerinin render'ı piksel taramasıyla doğrulandı. Cihaz testi bekliyor.

---

## 65. Sunucu güvenlik denetimi + kapsamlı guard/serialization düzeltmeleri (2026-07-10)

> Bildirilen tek açıktan (GET /match-announcements/pitch/:pitchId kaptanın tam User'ını sızdırıyor)
> yola çıkan denetim (2 keşif ajanı + manuel doğrulama + salt-okunur prod DB kontrolü) **sistemik**
> bir tabloyu ortaya çıkardı: **global guard YOK**, hiçbir entity `@Exclude`/`select:false` kullanmıyor,
> `ReservationsController` **tamamen korumasız** (20 uç, 16 yazma) ve birkaç işletme/abonelik ucu guard'sız
> IDOR taşıyor. Kullanıcı "hepsini çöz" dedi (O5 hariç). **Hepsi yalnız server → Render deploy; client
> DEĞİŞMEDİ** (istemci `api.ts` global interceptor'ı zaten her isteğe Bearer token ekliyor → guard eklemek
> yayındaki sürümleri BOZMAZ, kimlik `req.user.id`'den türetilir, IDOR kapanır). Prod istismar izi YOK
> (19 kullanıcı/5 işletme/5 abonelik — hepsi trial+RC ID'li).

### Kilit desen: geriye-uyumlu guard + token'dan kimlik
İstemci `ownerId`/`teamId`/`userId`'yi query/body'de gönderiyordu; artık **YOK SAYILIR**, kimlik JWT
`sub`'ından (`req.user.id`) alınır. Business token'ında `sub = owner.id`, user token'ında `sub = user.id`
(aynı `JwtAuthGuard`, aynı `JWT_SECRET`). Legitimate istek için `req.user.id === gönderilen id` olduğundan
davranış değişmez. Login `ownerId: owner.id` döndüğü için istemci hep kendi id'sini gönderiyordu (teyit edildi).

### Yeni ortak altyapı
- **`common/sanitize-user.util.ts`** — `SENSITIVE_USER_FIELDS` (password, email, phone, pushToken,
  latitude, longitude, isChatBanned, chatBannedAt, chatBanExpiry, phoneVerified) + `sanitizeUser<T>()`.
  Tek kaynak; `teams.service` kendi kopyasını buna delege eder. Çok-kullanıcılı TÜM dönüşlerde kullan
  (kendi kaydını dönerken KULLANMA — email/phone normaldir).
- **`common/upload-throttler.guard.ts`** — `POST /files/upload` register akışında token'sız çağrıldığından
  guard EKLENEMEZ; yalnız IP rate-limit (`app.module` yeni `upload` throttler'ı 30/dk; otp-* `@SkipThrottle`'lı).

### Düzeltmeler (önem sırasına göre)
- **K1 (bildirilen):** `match-announcements.service findByPitch` — `team.captain` leftJoin'i KALDIRILDI
  (istemci okumuyor; `findAll` zaten yalnız team skaleri yüklüyor). İç `handleCron` captain join'i client'a
  dönmediğinden dokunulmadı.
- **K2/Y6:** `ReservationsController` komple yeniden yazıldı — her uç `@UseGuards(JwtAuthGuard)` + sahiplik.
  Lifecycle'a 3 public helper: `assertOwnsBusiness`/`assertPitchOwnedBy` (owner↔pitch→business) +
  `resolveUserTeamId` (user→team). İşletme metotları `ownerId`, müşteri metotları `userId` alır (facade
  imzaları senkron). **Ölü route'lar SİLİNDİ:** `POST /reservations` (create — server-side'dan üretilir;
  public route sahte rezervasyon riskiydi), `GET /reservations` (findAll — tüm platform), `GET /my-team`.
  Servis metotları (create vb.) iç çağıranlar için KALDI. `GET /pitch/:id` guard'lı ama sahiplik-scope'suz
  (müsaitlik ızgarası herkese açık). `propose-time` (çağıransız) guard'lanıp tutuldu.
- **K3/Y2:** `SubscriptionController confirm-purchase`/`schedule-downgrade`/`owner/:ownerId` guard'lı +
  `ownerId` token'dan (ödeme doğrulamasız plan yükseltme + billing IDOR kapandı). `plans`/webhook public kaldı.
- **K4/Y1:** `BusinessOwnerController` tüm guard'sız uçlar guard'landı + `ownerId` token'dan (dashboard/stats/
  notifications/approve-reservation IDOR). `GET :id` yanıtından password+pushToken strip. `approveReservation`
  artık ownerId'yi `reservationsService.approve`'a geçirip sahipliği doğruluyor (`approve-reservation/:id`
  = `/reservations/:id/approve`'un ölü kopyası).
- **Y3:** `business.service mapWithOwnerPhone` — gömülü tam `owner` (BusinessOwner: parola hash'i + PII)
  yanıttan çıkarıldı; yalnız düz `ownerPhone` yayılır. `/businesses` public listeleme güvenli.
- **Y4:** `POST /users/seed-feet` + `seedFeet()` **tamamen SİLİNDİ** (ölü bakım ucu, çağıransız, tüm
  kullanıcıları mutasyona uğratıyordu — §21 T1.4 orphan-route emsali).
- **Y5:** pitch/business change-requests uçları guard'lı + `businessId`/`pitchId` sahiplik doğrulaması
  (`assertBusinessOwnedBy`); businessId artık body'den değil saha→işletmeden türetilir.
- **O1/O2/O4:** `getJokers`, `chat getUserChannels`/`getChannelMessages`, admin şikayet listeleri — eksik
  sanitizasyon (yalnız password+pushToken) tam `SENSITIVE_USER_FIELDS`'e yükseltildi. Admin panel yalnız
  username/full_name okur → güvenli.
- **O3:** `GET /join-requests/team/:teamId` — kaptan/yardımcı-kaptan yetki kontrolü eklendi (accept/reject
  deseni) + başvuran User sanitize.
- **O6:** `files/upload` IP rate-limit (yukarıda).

### O5 — ERTELENDİ (kullanıcı: "şimdilik dokunma")
Kodda gömülü fallback secret'ler (`process.env.JWT_SECRET || 'SECRET_KEY'`, `|| 'ADMIN_SECRET_KEY'` —
jwt.strategy, auth/admin/gateway modülleri, app.gateway) **DEĞİŞTİRİLMEDİ**. Render env'in set olduğu
belirsiz; önce doğrulanmadan kaldırmak (env eksikse fail-fast) prod'u kilitleyebilir. `.env`'de tanımlılar.

### Doğrulama
`cd server && npm run build` ✓ + `npm run lint` temiz (yalnız önceden var olan e2e parse hatası). Guard
kapsamı statik doğrulandı (her mutasyon ucu guard'lı; yalnız `subscription/plans` + webhook + `files/upload`
kasıtlı public). İç çağıran taraması: değişen tek facade çağrısı `business-owner.service approve` (güncellendi).
Prod'a `synchronize:true` ile bağlanılmadı (boot atlanmadı — şema riski). Deploy: **yalnız server (Render)**.

## 66. AnimatedSplash kare-zamanlı rAF sürücüsü — KURAL: boot yolunda duvar-saatli CSS animasyonu YASAK (2026-07-11)

**Belirti (kalıcı vaka):** Redmi 10S "recents'ten öldür → HEMEN aç" soğuk açılışında animasyon hiç
görünmüyordu (boş lacivert → login); 30dk sonra açınca ÇALIŞIYORDU. §64'teki saat-kapısı (`started`,
double-rAF) da YETMEDİ — kullanıcı yeni build ile doğruladı.

**Kök neden (sınıf):** CSS keyframe animasyonları belge zaman çizelgesinde (DUVAR SAATİ) akar. Soğuk süreç
açılışında WebView laciverti hızla boyar (double-rAF erken ateşlenir, animasyon saatleri başlar), SONRA ana
iş parçacığı boya-sonrası ağır boot işine dalar (perde arkası lazy chunk parse, provider'lar, socket) —
ekran güncellenemezken CSS saatleri tükenir, `setTimeout`'lar ise gecikir → perde solması görünmeden
tamamlanır, kullanıcı doğrudan login görür. "Hemen aç" en yavaş boot'tur (MIUI öldürme temizliğiyle
yarışır); sakin sistemde animasyon yetişir → gizli/aralıklı hata.

**Çözüm — rAF "oyun döngüsü" sürücüsü (`AnimatedSplash.tsx`):** CSS keyframe animasyonları kaldırıldı
(yalnız reduce-motion perde solması CSS kaldı). Zaman çizelgesi `TIMELINE` verisi (19 öğe: kind
draw/pop/fadein + dur/delay/ease) + JS `cubicBezier` değerlendiricisi (Newton+ikiye bölme). Tek rAF
döngüsü: `acc += min(dt, 50ms)` — **animasyon yalnız GERÇEKTEN ÇİZİLEN karelerle ilerler**; duraklamada
DURAKLAR, sıçramaz (dt-clamp 50ms: tek dev kare gelse bile ≤50ms ilerler; sürekli yavaş karelerde tempo
düşer ama hep görünür). Stiller imperatif yazılır (`data-splash-key` → Map, kare başına React render YOK).
Reveal (`5.45×SPEED` → markBootSplashDone) ve finish (`5.85×SPEED`) AYNI birikimli saatten → perde solması
ve Login mount'u görünenle hep senkron. Felaket sigortası: 5sn'de acc≈0 ise statik son kare + 1.2sn sonra
finish. `started` state'i ve animationstart watchdog'u kaldırıldı (sürücünün kendisi kare-kanıtlı).

**KURAL (kalıcı):** Boot/perde yolunda kritik zamanlamalı animasyon CSS keyframe ile YAPILMAZ — kare-zamanlı
rAF sürücüsü kullanılır. CSS animasyonu yalnız main-thread duraklamasının önemsiz olduğu (boot-sonrası,
oturum-içi) yüzeylerde serbesttir. Test düzeneği notu: headless Chrome `--virtual-time-budget` rAF tick
sayısını kısıtlar → dt-clamp ile acc ~1sn'de kalır; kare matematiği `raf-preview.html#acc=X` atlamasıyla
doğrulanır (scratchpad gen-raf-preview.cjs).

**Doğrulama:** kare matematiği sabit anlarda görsel doğrulandı (acc=2.6: amblem tam + "D" yazılmış;
acc=4.0: DİMLİ eksiksiz, perde opak). Build + sync ✓.

**GÜNCELLEME (kare-ısınma kapısı — Redmi kök neden KESİN çözüm, cihazda doğrulandı 2026-07-11):** rAF
sürücüsü tek başına da yetmedi. Kesin teşhis (Redmi USB + adb + canlı DevTools): cihaz WebView **92**
(2021, hiç güncellenmemiş, fabrika sürümü). **Asıl mekanik:** rAF geri çağrıları ANA İŞ PARÇACIĞINDA koşar;
soğuk başlangıçta ana thread ağır boot işiyle aralıklı bloke olur. Bloklar arası boşluklarda rAF tek-tük
ateşlenir ve `acc`'yi ilerletir AMA compositor basmadan thread yeniden bloke olur → `acc` EKRANA YANSIMADAN
~50ms adımlarla bitişe yürür → perde görünmeden solar → login. Yani "rAF ateşlendi ≠ kare EKRANA BASILDI".
Boot akıcı olduğunda (geri-tuşu ılık süreç / 30dk sakin sistem) bloklar yok → görünür.
**Çözüm — ısınma (warm) kapısı:** `acc` yalnız AKICI kareler basılırken ilerler. Sürücüde `goodStreak`:
ardışık kareler `WARM_FRAME_MS=100`ms'ten yakınsa say, uzaksa (boot blokajı gap'i) sıfırla; `WARM_STREAK=4`
ardışık akıcı kare → `warm=true`, `acc` o an SIFIRDAN başlar (animasyon tam baştan görünür). warm'a kadar
`acc` ilerlemez (navy perde). **Native `SplashScreen.hide()` de warm anına ERTELENDİ** (eski ilk-rAF yerine)
→ boot boyunca native navy splash durur, WebView gerçekten akıcı basınca devralınır (dikişsiz, gerçek-boya
garantili). Isınma felaket sigortası: `WARM_FAILSAFE_MS=4500`ms'te warm olmadıysa native hide + statik son
kare + kısa sonra finish (boş ekran imkânsız). Hızlı cihaz/iOS: ilk 4 kare <100ms → warm ~66ms, anında
başlar (regresyon yok). **KURAL eki:** boot-yolu animasyonlarında rAF ateşlenmesine güvenme; ilk N akıcı
kareyle "compositor gerçekten basıyor" ısınmasını bekle, native splash'ı ancak o an devral. Teşhis için
`__SPLASH_DEBUG` bayrağı (logcat `[splash]` logları; prod'da false). **Cihaz testinde ÇÖZÜLDÜ (kullanıcı onayı).**

## 67. Konum izni istemi splash sonrası Login ekranına ertelendi (2026-07-11)

**Sorun:** İlk kurulumda native konum izni dialogu açılış animasyonu (AnimatedSplash) OYNARKEN, perde
arkasında beliriyordu — `LocationContext` mount efekti (`useEffect [], :257-258`) oturum/ekran durumuna
bakmadan koşulsuz `requestLocation(true)` çağırıyordu (`Geolocation.requestPermissions()` → §33 tek istem
noktası). LocationProvider provider ağacında olduğundan splash perdesiyle aynı anda mount olur → istem
splash sırasında çıkar.

**Düzeltme (2 dosya):**
- `contexts/LocationContext.tsx`: boot çağrısı `requestLocation(true)` → **`requestLocation(false)`** (SESSİZ).
  Artık boot'ta dialog AÇILMAZ: izin zaten verilmişse konum tazelenir, promptable ise hiçbir şey yapmaz
  (`if (permStatus.location !== 'granted') return`). appStateChange listener'ı ve diğer her şey aynı.
- `pages/customer/Login/Login.tsx`: `useLocationContext()` + efekt — `splashDone && !token` olunca BİR KEZ
  (ref guard), 800ms gecikmeyle `requestLocation(true)`. Gecikme login giriş koreografisinin (logo/form
  enter-up ~940ms) oturmasını bekler → dialog sakin ekranda belirir. `requestLocation` stabil useCallback
  (`[updateCoords]`), splashDone tek sefer flip → efekt bir kez.
- **Neden güvenli (§33 uyumu):** konumu login'den önce/sonra almak sunucuya etkisiz — `syncLocationToServer`
  `getToken()` yoksa bail, sync efekti `isCustomer`-only. coords localStorage cache'ten seed'lenir →
  dönen granted kullanıcı boot'ta sessizce çalışır. Tüm coords tüketicileri ProtectedRoute +
  LocationAccessGate arkasında (coords null'da zarif düşer). İşletme login'i konum kullanmaz (ayrı akış).
- **Davranış:** yeni kurulum (oturumsuz) → splash biter → Login belirir → ~800ms sonra izin dialogu Login
  üstünde. Dönen izinli müşteri → boot'ta sessiz tazeleme, dialog yok. Dönen izinsiz müşteri (nadir) →
  hedef sayfada LocationAccessGate "Tekrar Dene" ile ister (mevcut zarif düşüş). Build + sync ✓.

## 68. Server `any` sıfırlama turu — 68 açık any → 0 (+ derleyici/lint sertleştirme) (2026-07-11)

> §21'de ertelenen tüm `any` borcu + sonradan birikenler kapatıldı: 22 dosyada 68 açık `any`
> gerçek tipleriyle değiştirildi (13 batch commit, B1-B12c). Yanıt JSON şekilleri DEĞİŞMEDİ —
> her batch sonrası **dist-diff** ile doğrulandı (bkz. doğrulama deseni); yalnız aşağıdaki onaylı
> hata düzeltmeleri çalışma zamanına dokundu. tsconfig `noImplicitAny: true` +
> `useUnknownInCatchVariables: true` ve eslint `no-explicit-any: 'warn'` AÇIK (src'de 0 uyarı).

### Kalıcı tip yerleşimi (yeni kod bu düzene uyar)
- **`ChatMessageMetadata`** → `chat-message.entity.ts` (kolonla aynı dosya): **KATI discriminated
  union, 8 arm** — rezervasyon ailesi tek arm'da 18 type literal (MATCH_APPROVED…UNDO_CANCEL_REQUEST,
  BUSINESS_CLOSED/PITCH_REMOVED/PITCH_SCHEDULED_OFFLINE scope'ları dahil) + PROPOSAL_ACTION,
  REMATCH_PROPOSAL, MATCH_CONFIRMED, JOKER_* arm'ları. **Yeni sistem-mesaj tipi eklerken union'a
  ARM EKLE, gevşetme.** Yazıcılar: chat.service + reservation-* (`sendSystemMessage` aktarıcısı —
  onun parametresi de bu tip). Derleyici eksik arm'ı yazıcıda TS2322 ile gösterir.
- **`NotificationMetadata`** → `notification.entity.ts`: GENİŞ opsiyonel interface + `[k: string]:
  unknown` (~40 yazım noktası serbest kalır). **KURAL: yeni anahtar OKUYACAKSAN interface'e gerçek
  tipiyle ekle; okuma yerinde cast etme.** `NotificationTeamMeta` da orada.
- Servis yanıt/projeksiyon tipleri üreten servisin başında **export** edilir (match-announcements
  emsali). `declaration: true` → public imzada geçen HER tip export ZORUNLU (TS4053).
- Yeni eklenen tipler: ChannelListItem/LastMessageRow/LastMessageView/UnreadRow/ChannelMatchDetails/
  ChannelMatchTeamData/JokerInChannel (chat.service); TeamJokerInviteGroup/JokerEntry (notifications);
  DashboardPitchSlots/DashboardSlot/PitchStat/StatPeriod + EnrichedTeam/EnrichedReservation
  (business-owner); MarketplaceRawRow/MarketplaceAnnouncement (match-announcements);
  TeamWithMatchCount (teams); JokerListItem/JokerDistanceRow (users); BusinessWithOwnerPhone
  (business); SeedSubscriptionDetail, AdminChangeRequestListItem/AdminPitchApprovalListItem,
  AdminBusinessListItem, PendingChangeRequestListItem (admin/pcr); RawServiceAccount (firebase);
  SocketData/AppSocket (gateway).

### Entity gerçeklik düzeltmeleri (şema no-op — kolon tanımları değişmedi)
- **`User.team: Team | null`** — kolon zaten nullable'dı, TS tipi yalan söylüyordu. Tüm `user.team.*`
  erişimleri zaten `if (!user?.team) throw` guard'lıydı → **SIFIR cascade** çıktı.
- **`User.teamId: string | null` + açık `type: 'varchar'`** (repo kuralı: `| null` alan = açık kolon
  tipi). Tek fallout: chat `getJokersInChannel` includes(null) örtük davranışı açık guard'a çevrildi
  (sonuç birebir aynı).
- `teams.service.findOne → Promise<TeamWithMatchCount | null>` — `:247 as any` TÜM çağıranların tip
  güvenliğini siliyordu; 22 çağıran değişmeden derlendi.
- Not: ilişki alanının `Team | null` olması design:type'ı Function→Object yapar — TypeORM ilişkilerde
  design:type OKUMAZ (FK tipi karşı PK'dan), şema etkisi yok (§21 T3.1 emsali).

### Onaylı hata düzeltmeleri (davranışın değiştiği TEK yerler)
1. `notifications.service:84` kaptan guard'ı — captainId boş + ilişki yüklenmemişse TypeError/500
   yerine `NotFoundException('Takım kaptanı bulunamadı.')`.
2. `match-announcements` cron ölü fallback silindi — `(captain as any).id || captain` çalışsaydı
   `userId`'ye USER NESNESİ yazardı.
3. `business-owner` `r.status === 'APPROVED'` literal'leri → `ReservationStatus` enum (değer-özdeş).
4. `'trial' as any` → `SubscriptionStatus.TRIAL` (değer-özdeş).
5. `subscription.handleWebhook` eksik `app_user_id` guard'ı — bozuk payload artık hiçbir aboneliğe
   dokunmaz (eskiden tanımsız davranıştı).

### Sertleştirme (AÇIK — geri alma yok)
- tsconfig `noImplicitAny: true` (5 düzeltme: auth.controller `req: { user: Omit<User,'password'> }`
  + `import type` — TS1272; user-blocks ×4 `req: { user: Express.User }`).
- tsconfig `useUnknownInCatchVariables: true` (firebase ×2 FirebaseError-şekli narrowing, seed ×1).
- eslint `@typescript-eslint/no-explicit-any: 'warn'` — kabul kapısı src'de 0 uyarı. 'error' değil:
  `npm run lint` --fix akışı kırılmasın.
- **ERTELENDİ:** gateway typed EmitEvents haritası (Server generic'i tüm `server.to().emit()`
  çağrılarına yayılır — ayrı task).

### Doğrulama deseni (sonraki turlar için tekrar edilebilir)
Batch başına: `npm run build` (exit 0; nest çıktısında hatalar RENKLİ — `grep 'error TS'` renk kodu
yüzünden KAÇIRIR, `tail`/`grep 'Found.*error'` kullan) → `diff -r -x '*.d.ts' -x '*.map'
dist-baseline dist` (saf-tip batch = boş fark; enum/guard farkları tek tek incelenir) → `npx eslint
"{src,apps,libs,test}/**/*.ts"` (**`npm run lint` DEĞİL — --fix mutasyonu**) → `npm test`. Sunucu
üretim DB'sine karşı HİÇ açılmadı (değişiklikler derleme-zamanı; kanıt dist-diff).

## 69. Zorunlu güncelleme kapısı (force update) — mağaza-sürümü bazlı (2026-07-11)

> Mağazada yeni sürüm yayınlanır yayınlanmaz eski kurulumlar tam-ekran "YENİ SÜRÜM" kapısıyla
> kilitlenir; tek CTA "Şimdi Güncelle". Tamamen client-side — sunucu endpoint'i/admin işi YOK
> (kullanıcı kararı). Paket: **`@capawesome/capacitor-app-update@^6.1.0`** — Capacitor 6 uyumlu;
> **v7.x Capacitor 7 ister, YÜKSELTME**. `npx cap sync` yeter (Info.plist/Manifest/gradle elle
> değişiklik yok; Podfile + capacitor.settings/build.gradle otomatik).

### Dosyalar
- `client/services/updateGateStore.ts` — kontrol mantığı (bootSplashStore deseni: modül-scope
  store + `useSyncExternalStore`; context/auth/router gerektirmez). iOS App Store ID sabiti
  burada: `6764278538`.
- `client/components/UpdateGate.tsx` — engelleyici UI; `client/utils/appVersion.ts` —
  bağımlılıksız semver-lite (`isVersionNewer`, her şüphede false).
- `client/App.tsx` — `<UpdateGate />` provider ağacının KARDEŞİ (AnimatedSplash gibi; login
  dahil her ekranı örter, `isReady`/router beklemez).

### Karar kaynakları + KRİTİK dersler
- **Android:** Play Core `updateAvailability` OTORİTER (versionCode + kademeli yayın yüzdesi +
  cihaz uyumluluğu cihaz-başına). String karşılaştırma YOK. Sideload/debug build'de çağrı
  REJECT olur → catch = fail-open (beklenen davranış, bug değil).
- **iOS:** iTunes lookup (bundleId). **`{ country: 'tr' }` ZORUNLU — verilmezse ABD vitrinine
  sorar → 0 sonuç → kalıcı sessiz fail-open.** Native `.numeric` karşılaştırır; JS'te
  `isVersionNewer(availableVersionName, currentVersionName)` çifte kontrol. **Anti-brick:**
  cihaz `minimumOsVersion` altındaysa kapı GÖSTERİLMEZ (güncellemeyi kuramaz — engellemek
  cihazı kalıcı kilitlerdi).
- **FAIL-OPEN İLKESİ (asla brick yok):** offline/timeout/lookup boş/Play Services yok/
  sideload/parse hatası/eski-OS → kapı yok, kullanıcı normal devam eder.

### UI/akış kuralları
- Kontrol splash oynarken paralel başlar (fire-and-forget); UI `useBootSplashDone()` bekler
  (§67 — splash sırasında asla etkileşimli UI yok). Resume'da (`appStateChange` active) 30 dk
  throttle ile yeniden kontrol. `updateRequired` monoton true (güncelleme sonrası uygulama
  zaten yeniden başlar).
- Portal (§35), `z-[9998]` (modalların üstü, splash `9999` altı), **statik — animate-fade-in
  bilinçli YOK (§66)**, X/backdrop kapatma yok. **Android geri tuşuna müdahale GEREKMEZ:**
  App.tsx handler'ı ya portalin arkasında history.back yapar (kapı route-bağımsız, kalır) ya
  kök route'ta exitApp (yeniden açılışta kapı geri gelir) — bypass imkânsız.
- CTA: iOS `window.open('itms-apps://apps.apple.com/app/id6764278538', '_system')` (repo
  deseni); Android önce `performImmediateUpdate()` (tam-ekran Play akışı), düşerse
  `AppUpdate.openAppStore()` (native market://→https fallback'i plugin içinde — JS window.open
  bunu YAPAMAZ, plugini kullan).

### Test tekniği (mağaza sürümü 1.4 canlıyken)
- **iOS (mağaza kurulumu GEREKMEZ):** Xcode'da `MARKETING_VERSION = 1.3` → gerçek cihazda kapı
  perde biter bitmez görünmeli; CTA App Store'u açar. SONRA GERİ AL. Uçak modu soğuk açılış →
  kapı yok (fail-open kanıtı).
- **Android tam akış:** Play Console → **Internal App Sharing** (test kanallarının aksine DÜŞÜK
  versionCode kabul eder): `versionCode 28 / versionName 1.3` imzalı build → kapı + Play
  güncelleme akışı. Debug sideload'da kapı çıkMAZ (logcat: `[updateGate] check failed`) — doğru.

### Yayın beklentisi
Kapı yalnız onu taşıyan build'lerde: **1.5** (Android versionCode 30, iOS build 44) olarak
yayınlanır; sahadaki ≤1.4 kurulumlar kapıyı hiç edinmez. Zorlama ilk kez 1.5 SONRASI yayında
(1.6, 1.5'i engeller) devreye girer. iOS lookup CDN'i onaydan sonra ~saatler gecikebilir —
kullanıcılar kademeli kapılanır (arada fail-open).

## 70. Takım rengi okunurluk hattı + "forma degradesi" chat tasarımı (2026-07-11)

> Rakipli maç chatlerinde takım renkleri artık render anında WCAG-kontrast garantili çözülür ve
> mesaj gösterimi sol-çubuk yerine forma degradesi oldu. **KURAL: kayıtlı
> `Team.primaryColor/secondaryColor` ASLA değiştirilmez (§9)** — tüm düzeltme sadece render
> anında, tek geçiş noktası `client/utils/colorUtils.ts` → `resolveTeamChatColors`.

### Render hattı (`colorUtils.ts`)
1. `isValidHex` değilse fallback (`#3b82f6`/`#ef4444`).
2. `ensureReadableOnDark`: `contrastRatio` (WCAG 2.1) ile `CHAT_BUBBLE_SURFACE = '#1e293b'`
   (slate-800, accent'in bindiği EN AÇIK yüzey) üzerinde **4.5:1** hedefi — 11px semibold
   gönderen adı küçük metin sayılır (AA). Doygunluk tabanı 40 (çamur griler ton korunarak
   çelik tona döner), L +1 adım, üst sınır 85. Saf/deterministik + idempotent.
3. Çakışma kontrolleri kaldırmadan SONRA: `isTooClose` (hue<40 VE |L|<20; iki gri ise sadece L)
   — kendi-mesaj yeşili `OWN_MESSAGE_COLOR` ve rakip takımla. **Sıralama yük taşır:** hue
   kaydırma parlaklığı bozabilir ama parlaklık kaldırma hue'yu bozamaz → her `nudgeAwayFrom`
   sonucu yeniden `ensureReadableOnDark`'a sarılır.
4. Çıktı `TeamAccent`: `base` (okunur hex — isim/halka/nokta), `secondaryBase` (okunur ikincil,
   yoksa base), `soft` 0.14 / `secondarySoft` 0.10 (degrade uçları), `border` 0.35, `glow` 0.35.
   **Alfa formatı `rgba(r,g,b,a)` string — `#RRGGBBAA` DEĞİL** (eski WebView desteği; dvh/svh
   yasağıyla aynı gerekçe, §23 ailesi).

### Forma degradesi tasarımı (MessageBubble.tsx)
- Rakip mesaj bubble'ı: `bg-slate-800` üstüne `linear-gradient(135deg, soft, secondarySoft)` +
  kenarlık `border`. 3px sol çubuk KALDIRILDI. Degrade gruplanmış mesajların hepsine uygulanır.
- Gönderen adı `base`; avatar `boxShadow: 0 0 0 1.5px #0f172a, 0 0 0 3px base` (koyu boşluklu
  forma halkası); logosuz fallback'te zemin `base` + baş harf `#0f172a` (base artık hep açık).
- Kendi mesajlar turf yeşili KALIR (hangisi-benim ayrımı takım renginden bağımsız). Header
  çipleri: nokta `linear-gradient(135deg, base 50%, secondaryBase 50%)` iki renkli forma deseni.
- `MatchDetailModal` 64px forma karoları HAM kalır (kimlik gösterimi, metin değil) — kaldırma
  uygulanmaz. MessageBubble'daki yerel renk tipi artık `TeamAccent` import eder (kopya yasak).

### Veri + picker
- `chat.service.ts` avatarData'ya `homeTeamSecondaryColor/awayTeamSecondaryColor` eklendi
  (takım select'ine `secondaryColor`); inline avatarData tipi `ChannelAvatarData` ile birleşti.
- `ColorPickerModal.TEAM_COLORS`: 24 preset'in TAMAMI #1e293b'de ≥4.5:1 geçer. Koyu tonlar aynı
  aileden okunur tonlarla değişti (Siyah #111827→Füme #9ca3af, Lacivert #1e3a8a→#7594e8, Bordo
  #9f1239→#fb7185, Koyu Mor #6d28d9→#a78bfa, Grafit #475569→#8b9cb8, Kahve #92400e→Karamel
  #d9a066, Koyu Yeşil #15803d→Zümrüt #34d399); orta tonlar da `ensureReadableOnDark` çıktısına
  hizalandı (Mavi #5090f7, Kırmızı #f15f5f, Mor #b56df8, Pembe #ee59a3, Fuşya #dc56f0, İndigo
  #8587f4) → preset'lerde "seçilen = chat'te görülen" birebir. Serbest HSL/hex girişi serbest
  kaldı; modal içine `buildTeamAccent` ile canlı "SOHBETTE BÖYLE GÖRÜNÜR" önizlemesi eklendi.
- `UpdateTeamDto` oluşturuldu (PATCH /teams/:id'deki inline anonim tip ValidationPipe'ı
  BYPASS ediyordu); create+update DTO'larında renkler `@Matches(/^#[0-9a-fA-F]{6}$/)`.

### Ayrıca (aynı tur, ilgisiz iki küçük fix)
- `BusinessLoginHeader.tsx`: "İŞLETME PANELİ" son İ'si kesikti — sentetik italik (italik Inter
  yüzü paketli değil) + `backgroundClip:text` glif taşmasını boyamıyor → h1'e 0.15em yatay
  padding. Aynı deseni kullanan yeni başlıklarda da padding şart.
- `OwnerInfoStep.tsx`: Ad Soyad input'una eksik `placeholder="Ad Soyad"` eklendi.

## 71. Android launcher ikonu çözünürlük düzeltmesi — adaptive foreground 108dp (2026-07-11)

**Belirti:** Redmi 10S'te uygulama (launcher) ikonu bulanık/düşük kalite; App Store (iOS) net.
**Kök neden:** Android 8+ **adaptive icon** katmanları (foreground/background) **108dp** yoğunlukta olmalı
(mdpi 108px … xxxhdpi **432px**). `generate-icons.cjs` bunları **48dp** yoğunlukta üretiyordu (xxxhdpi
sadece 192px = gerekenin ~%44'ü) → MIUI launcher slotuna büyütünce bulanık. Ek olarak foreground `dimli.png`'yi
%72 küçültüp pad'liyordu (floating/küçük). Kaynak `assets/dimli.png` 1024² yeterli — sorun tamamen üretim
yoğunluğunda. iOS 1024px'i tek parça kullandığından etkilenmiyordu.
**Düzeltme (`scripts/generate-icons.cjs` + adaptive XML):**
- `MIPMAP_DENSITIES`: her yoğunluk için `adaptive` (108dp: 81/108/162/216/324/432) + `legacy` (48dp:
  36/48/72/96/144/192).
- `ic_launcher_background.png` KALDIRILDI; `mipmap-anydpi-v26/ic_launcher{,_round}.xml` `<background>` →
  `@color/dimliPitch` (#0f172a, colors.xml'de mevcut) → renk drawable, çözünürlükten bağımsız her zaman keskin.
- iOS AppIcon, `icon.png` (in-app/splash), web/splash DEĞİŞMEDİ.

**DÜZELTME (kompozisyon — full-bleed HATALIYDI, %72 inset'e dönüldü 2026-07-11):** İlk denemede adaptive
foreground **full-bleed dimli.png** yapıldı → cihazda logo çok BÜYÜK/KABA, arka plan siyah (stadyum
kaybolmuş). **KALICI GOTCHA:** adaptive icon'lar (özellikle MIUI/Redmi) foreground'un MERKEZİNE ~1.5× zoom
yapıp kenarları kırpar → full-bleed logo devleşir. Doğru kompozisyon: `ic_launcher_foreground.png` =
**dimli.png %72 içeriden, şeffaf pad, `adaptive` kanvasa ortalanmış** (kanvas 108dp korunur → yüksek çöz.).
Böylece MIUI zoom'undan sonra logo iOS boyutunda + stadyum kenarları görünür. %72 değeri iOS referansıyla
yan-yana kalibrasyonla seçildi (headless Chrome, MIUI zoom modeli: merkez 72dp → tile; %72≈iOS, %82+ kaba).
Legacy `ic_launcher.png`/`_round.png` full-bleed kalır (eski launcher adaptive-zoom yapmaz → full-bleed =
tam iOS kompozisyonu). **KURAL:** adaptive foreground'a asla full-bleed detaylı kompozisyon koyma; içeriği
merkez güvenli bölgeye (~%66-72) sığdır.
**Deploy:** yalnız native Android kaynağı → `npm run build`/`cap sync` GEREKMEZ; APK yeniden derlenip kurulur.
Launcher ikon önbelleği nedeniyle bazen uygulamayı KALDIRIP yeniden kurmak gerekir. Cihaz doğrulaması bekliyor.

---

## 72. Konum senkron düzeltmeleri — boot yarışı + retry + Joker kendi kart overlay (2026-07-11)

> Belirti: Sahalar/Maç Pazarı taze konumla çalışırken Joker sayfası ve Profilim Konum kartı eski ilçeyi
> gösterdi (kullanıcı Kağıthane'de, ekranda "Şişli"); ancak manuel "Konumu Güncelle" düzeltti. Sahalar/Maç
> Pazarı canlı coords ile SAHALARIN ilçesini gösterdiği için hep taze görünür; Joker kartı + Profilim ise
> sunucuda saklanan `user.location` kolonunu gösterir (yalnız `PATCH /users/me` günceller, §33).

**Kök nedenler (3):**
1. **Boot yarışı — uçuştaki senkron düşürülüyordu:** açılışta `coords` localStorage cache'inden başlar;
   sync effect hemen ESKİ koordinatla PATCH atar (sunucu ilçeyi yeniden eski değere yazar). Taze GPS fix'i
   bu PATCH uçuştayken gelirse `syncInFlightRef` koruması onu sessizce düşürüyordu ve HİÇBİR ŞEY yeniden
   denemiyordu (interval yalnız `requestLocation` çağırıyordu; coords <250m değişmeyince sync effect bir
   daha ateşlenmez) → DB ancak >250m harekette veya manuel butonla düzelir.
2. **Başarısız PATCH retry'sız:** `syncLocationToServer` hatada sessiz; açılışta offline kalan süresiz bayat.
3. **Joker kendi kartı fetch satırından:** PATCH başarılı olsa bile liste yeniden çekilmediğinden kendi
   kartındaki ilçe eskide kalıyordu; SWR cache (`JOKERS_CACHE_KEY`) ilk boyamada da eski etiketi basar.

**Düzeltmeler (tamamı client-only; sunucu/DB değişikliği YOK; >250m kapısı + 2-3dk interval KORUNDU):**
- `LocationContext.syncLocationToServer` finally'sinde **kuyruk senkronu**: uçuş bitince `coordsRef.current`
  bu koşunun `c`'sinden farklıysa `void syncLocationToServer(latest,false)` — aynı kapı+korumadan geçtiği
  için sonlanır (başarıda mesafe 0 → no-op). Boot'ta düşen taze fix milisaniyeler içinde telafi edilir.
- **Interval tick iyileştirici**: `await requestLocation(false)` sonrası `syncLocationToServer(coords,false)`
  — sabit durumda kapı tutar (sıfır ek PATCH), yalnız başarısız/atlanmış senkronu telafi eder.
- **`useOnReconnect`** LocationProvider'da: ağ dönünce bekleyen senkron hemen atılır (tick beklenmez).
- **Logout temizliği**: `!token` effect'ine `setLocationName(null)` + `LOCNAME_CACHE_KEY` remove eklendi
  (ikinci hesap ilk hesabın ilçesiyle açılmasın). Coords cache'i cihaza ait → KALIR.
- **`useJokerPool.visibleJokers`**: kendi satırın `location`'ı render-time overlay ile canlı otoriteden
  (`locationName || currentUser.location`) — JokerCard değişmedi; PATCH-vs-fetch yarışı görüntüde anlamsız.

**Reddedilenler:** locationName değişince tam liste refetch (ölçekte gereksiz GET); `locationVersion` expose
(over-engineering); boot cache-PATCH'ini bastırmak (sunucu teyidi + currentUser besleme kaybolur); jokers
endpoint'inde canlı ilçe türetme (diğer kullanıcılar için saklanan kolon zaten doğru kaynak). Sekme geçişinde
GPS tetikleme EKLENMEDİ (kullanıcıya soruldu → mevcut boot+foreground+interval yapısı korundu). Sınır bölgesi
nüansı (>250m içi ilçe flip'i) KABUL — manuel "Konumu Güncelle" kaçış yolu var.

Doğrulama: `tsc --noEmit` (yalnız önceden var olan LocationStep) + `vite build` + `cap copy` ✓ (`cap sync`
pod install yerel CocoaPods/Ruby 3.4 bug'ı — §33'teki gibi kod dışı). **Deploy:** yalnız client → yeni native
sürüm ister. Cihaz testi: bayat cache'le soğuk açılış → saniyeler içinde Joker kendi kartı + Profilim doğru
ilçe; uçak modu aç/kapa → reconnect'te iyileşme; 10dk hareketsiz → tek PATCH; hesap değişimi → ilçe sızmaz.

## 73. Destek talebi sistemi — işletme/kullanıcı destek sayfaları + admin Destek Talepleri paneli (2026-07-12)

> İstek: işletme Ayarlar'a "Destek" kartı, kullanıcı Hesap Ayarları'na (Engellenen Kullanıcılar altına)
> "Yardım" satırı; ikisi de kategori + açıklama ile destek talebi oluşturur, geçmişini görür. Admin panelinde
> İşletme/Kullanıcı sekmeli "Destek Talepleri" sayfası; admin yanıt yazınca başvurana in-app + FCM push
> bildirim gider, ya da yanıtsız "İncelendi" işaretlenir. destek@dimli.com.tr yalnız mailto (sunucudan mail YOK).

**Sunucu — yeni modül `server/src/support-tickets/`** (şablon: `user-reports/`):
- `support_tickets` tek tablo, `audience: 'user'|'business'` ayırıcı + nullable `userId`/`ownerId` FK
  (`onDelete: CASCADE`). İndeksler: `[audience,status,createdAt]`, `[userId,createdAt]`, `[ownerId,createdAt]`,
  `[status]`. Durum makinesi: `pending → answered` (yanıtla) | `pending → reviewed` (okundu); ikisi terminal.
- Kategori key'leri TEK KAYNAK entity'de: `USER_SUPPORT_CATEGORIES` (MATCH_RESERVATION/TEAM/TECHNICAL/
  ACCOUNT/SUGGESTION/OTHER — PAYMENT deploy öncesi kaldırıldı, kullanıcı uygulamada ödeme yapmıyor) +
  `BUSINESS_SUPPORT_CATEGORIES` (RESERVATION/PAYMENT_SUBSCRIPTION/TECHNICAL/ACCOUNT_OWNER/SUGGESTION/OTHER).
  Türkçe etiketler client'ta (`client/services/supportService.ts`).
- Uçlar (`@Controller('support-tickets')` + `JwtAuthGuard`): `POST user`, `GET user/mine`, `POST business`,
  `GET business/mine`. JWT'de rol claim'i req.user'a GELMEDİĞİ için audience, id'nin ilgili tabloda (users /
  business_owner) PK-varlık kontrolüyle doğrulanır; yanlış tablo → Forbidden. Kötüye kullanım: 24 saatte
  submitter başına max 5 talep (indeksli COUNT) → Türkçe hata + mailto yönlendirme. mine uçları select'li
  (PII'siz), take 50.
- Admin: `admin/services/admin-support.service.ts` — `GET /admin/support-tickets` (audience+status+search,
  COUNT+ITEMS qb deseni §61 tarzı, `paginate()` zarfı). KRİTİK: User join'i `leftJoin + addSelect` ile YALNIZ
  gerekli kolonlar — `leftJoinAndSelect('t.user')` parola hash'i/pushToken sızdırır, KULLANMA. `PATCH :id/reply`
  (yalnız pending; adminReply/repliedAt/status=answered + bildirim), `PATCH :id/status` (yalnız 'reviewed'),
  `GET pending-count` (GROUP BY audience → `{total,user,business}`).
- Bildirim: kullanıcı yanıtı → `type:'SYSTEM'` + `metadata.type:'SUPPORT_REPLY'` (userSystemPushTypes'a
  eklendi); işletme yanıtı → yeni üst düzey tip `'SUPPORT_REPLY'` (entity union + businessPushTypes'a eklendi).
  Çapraz ateşleme yok: SYSTEM businessPushTypes'ta değil, SUPPORT_REPLY userPushTypes'ta değil.

**Admin panel:** `pages/SupportTicketsPage/` (+ `hooks/useSupportTickets.ts`, `usePaginatedList` ile) — üstte
İşletme/Kullanıcı sekmesi + Bekleyen/Yanıtlanan/İncelenen durum sekmesi (ikisi de extraParams). Detay modalı:
işletme → işletme adı/şehir-ilçe/işletme tel + yetkili ad/tel/e-posta ("Silinmiş işletme" notu); kullanıcı →
ad/kullanıcıadı/tel/ilçe(`location`)/e-posta. Yanıt textarea + "Yanıtla ve Bildir" / "İncelendi Olarak İşaretle".
Sidebar: `IconSupport` (can simidi) + pending-count badge (`r.data?.total`). Sky aksan.

**Mobil:** ortak katman `client/services/supportService.ts` + ortak liste `components/Support/TicketHistoryList.tsx`
(2 feature kullanıyor → components/ altında, §42 kuralı). İşletme: `pages/business/BusinessSupport/` — §62
Pattern A header, ROSE aksan (hub'da boştu), formStyles token'ları, `useKeyboardHeight` padding; hub kartı +
route `/business/settings/support`. Kullanıcı: `pages/customer/Support/SupportPage.tsx` — bg-pitch/font-sport
dili, turf aksan; Hesap Ayarları'nda "Yardım" satırı + route `/settings/support`. Her iki sayfa: mailto kartı →
kategori chip grid → açıklama (min 10 / max 2000, sayaç) → başarı paneli ("En kısa sürede dönüş yapacağız") →
Taleplerim (durum chip + "Dimli Destek" yanıt bloğu). dvh/svh YOK (vh/clamp).

**Bildirim tıklama yönlendirmeleri (3 nokta):** `NotificationItem` (SYSTEM+metadata SUPPORT_REPLY →
`/settings/support`), `BusinessNotificationsPage` (tip SUPPORT_REPLY → `/business/settings/support`),
`pushNotificationService.handleNotificationClick` (data.type SUPPORT_REPLY → `getRole()`'e göre hedef; iki
push yolu da data.type'ı SUPPORT_REPLY taşır — kullanıcı yolunda metadata.type forward edilir).

Doğrulama: `tsc --noEmit` server+admin temiz (client'ta yalnız önceden var olan LocationStep hatası);
`nest build` + iki `vite build` ✓; eslint yeni dosyalar 0 hata; canlı DB salt-okunur kontrol: tablo henüz yok
(deploy'da `synchronize:true` oluşturur; §9'a uygun, hiçbir yazma yapılmadı). **Deploy sırası:** önce server
(tablo + uçlar oluşsun), sonra admin panel; mobil sayfalar yeni native sürümle yayılır ama eski sürümlerde
görünmez (yalnız yeni menü girişleri) → kırılma yok. Cihaz testi: form gönderimi, günlük 5 limit mesajı,
yanıt bildirimi tap → destek sayfası, mailto.

## 74. Fotoğraf kırpma modalı yeniden yapımı — react-easy-crop (2026-07-12)

> Belirti: profil/takım/saha fotoğrafı kırpmada pinch ile yaklaşınca geri küçültülemiyor, kenarlarda
> görüntü "takılıyor", bazı bölgelere zoom yapılamıyordu. Kök nedenler (eski elle yazılmış motor):
> (1) min zoom sabit 0.3 iken başlangıç cover ölçeği büyük fotoğrafta ~0.08 → başlangıca dönüş imkânsız;
> (2) offset clamp yok + 2 parmaktan 1 parmağa geçişte touchend drag'i kapatıp yeniden silahlandırmıyor;
> (3) zoom hep merkez-orijinli, parmak odak noktası takip edilmiyor.

**Çözüm:** jest motoru **react-easy-crop 6.2.2** (`--legacy-peer-deps` ile kuruldu; React 19 uyumlu,
kendi TS tipleri, CSS otomatik enjekte). UI tamamen bizim: `components/Modals/ImageCropModal.tsx`
yeniden yazıldı (portal + `useModalBodyClass` konvansiyonu KORUNDU).

- **Props geriye dönük uyumlu:** `{ file, onCrop, onCancel, aspectRatio?=16/9 }` + YENİ
  `cropShape?: 'rect'|'round'` (varsayılan rect), `title?`, `outputWidth?` (varsayılan: kare 800, diğer 1280).
- **Cropper ayarları:** `minZoom=1` (= sığdırma; zoom-out her zaman başa döner), `maxZoom=5`,
  `restrictPosition` (görüntü çerçeveyi hep kaplar), odak noktalı pinch kütüphaneden,
  `showGrid={cropShape==='rect'}` (üçler kuralı yalnız dikdörtgende), `objectFit="contain"`.
- **UI:** header (X + turuncu başlık, safe-area top), flex-1 kırpma alanı, footer (safe-area bottom):
  ZoomOut/slider/ZoomIn satırı (44px hedefler, turuncu thumb), "Sıfırla", İptal (1/3) + Kaydet (2/3,
  spinner'lı, `isReady` olmadan disabled). Eski "Sahalar sayfasında..." ipucu metni KALDIRILDI
  (9 tüketicinin 4'ü için yanlıştı; bağlamı title verir). Rotate bilinçli DAHİL EDİLMEDİ (EXIF zaten
  WebView'de otomatik; ileride `rotation` prop'u ile additive eklenebilir).
- **Çıktı:** `utils/cropImage.ts getCroppedImg()` — canvas `imageSmoothingQuality:'high'`, JPEG q0.9,
  **upscale yok** (outW = min(hedef, kaynak kırpma genişliği)), dosya adı `.jpg`'ye normalize.
  KURAL: daire maske YALNIZ görsel; çıktı tam kare JPEG — canvas maskeleme YAPMA (alpha yok, uygulama
  avatarları zaten border-radius ile yuvarlak basar). EXIF manuel işlenmez (iOS ≥13.4 / Chromium ≥81
  HTMLImageElement'i otomatik oryante eder; react-easy-crop oryante elemanı ölçer → koordinatlar tutarlı).
- **Tüketiciler (9):** 4 müşteri tüketicisine yalnız `cropShape="round"` + `title` eklendi
  (ProfilePhotoManager, PhotoUploadStep, CreateTeamModal, TeamLogoManager — "Profil Fotoğrafı"/"Takım
  Logosu"); 5 işletme tüketicisi (BusinessAddPitch, PitchesAndPlanStep, BusinessDetailsStep,
  BusinessInfoSettings, BusinessPitchSettings) SIFIR değişiklik — varsayılan 16:9 rect aynı davranış.

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep `window.google`) + `vite build` ✓. Client-only;
sunucu/DB değişikliği yok; yeni native sürüm ister. Cihaz testi: pinch-in→pinch-out sığdırmaya döner,
kenar pan'de çerçeve boş kalmaz, köşede odaklı zoom, 2→1 parmak geçişi akıcı, daire maske avatar/logo
akışlarında, 16:9 ızgara saha akışlarında, iPhone kamera (EXIF) fotoğrafı dik, çıktı ≤800²/≤1280×720 `.jpg`.

---

## 75. Uygulama içi tanıtım turu (onboarding) — demo işletme + spotlight motoru (2026-07-12)

**Amaç:** Yeni kayıt olan müşteri, Hoş Geldin ekranındaki BAŞLA'ya basınca `/pitches`'te
**uygulamalı bir tanıtım turu** görür: "Dimli Halı Saha" adlı **%100 istemci-tarafı sahte** demo
işletme üzerinden kart aç → 20:00-21:00 boş slot → Maç Kur formu (rakip aranıyor / kendi aramızda
anlatımı + takım gerekliliği) → **sahte maç sohbeti** ("Onay Bekliyor" + işletmeyi ara sistem mesajı).
Joker Havuzu'na İLK girişte ayrıca 4 adımlık kısa tur. Her adımda "Atla"; Hesap Ayarları →
**Uygulama Tanıtımı** ile tekrar izlenebilir. (Bağlamsal parçalı tur; metinler kullanıcı onaylı.)

**Neden istemci-tarafı sahte veri:** Sunucuda demo kavramı yok; liste uçları aktif abonelik + onay
filtresi uygular, `POST /reservations` public ucu zaten kaldırılmış. Demo işletme DB'ye GİRMEZ,
hiçbir isteğe konu OLMAZ. Emniyet kemeri: `api.ts` request interceptor'ı URL'de `demo-` geçen her
isteği reddeder (`DEMO_BLOCKED`).

**Motor (kütüphanesiz):**
- `services/tourStore.ts` — modül store (currentUserStore deseni): `{activeTour:'pitches'|'jokers'|null,
  stepIndex, demoPhase:'idle'|'demoChat', skipConfirmOpen}`. API: `startTour/advanceStep/endTour/
  skipTour/emitTourEvent/setDemoPhase/registerTourCleanup/isTourActive/useTour/useTourActive/
  useAnyTourActive/requestTourSkipConfirm`.
- `services/tourStorage.ts` — Preferences + memCache (`initTourFlags()` App'te). Anahtarlar
  `tour_pitches_done_v1`, `tour_jokers_done_v1`. **Semantik: bayrak YOKSA görülmüş sayılır** —
  otomatik tur yalnız kayıt akışının `markTourPending('jokers')` yazdığı kullanıcıda tetiklenir
  (mevcut kullanıcılar güncellemede rahatsız edilmez). `startTour` bayrağı BAŞTA `done` yazar →
  yarıda kesilse de tekrar otomatik açılmaz (resume yok, bilinçli sadelik).
- `components/Tour/` — `tourTypes.ts` (adım modeli: `advance:'next'|'target-tap'|'event'`),
  `tourScripts.ts` (senaryolar), `TourOverlay.tsx` (spotlight: delik div `box-shadow 0 0 0 200vmax`
  karartma + deliğin 4 kenarında pointer-events:auto bloker → yalnız hedef tıklanabilir; rAF ile
  rect takibi, hedef 3sn'de bulunamazsa ortalanmış karta düşer — kilitlenmez), `TourTooltip.tsx`
  (delik üstü/altı kart, Atla+onay, safe-area sınırlı), `TourHost.tsx` (AppContent'te tek mount,
  `useBootSplashDone` bekler), `DemoChat.tsx` (gerçek Chat'in hafif GÖRSEL replikası — rota
  değişmez, socket çalışmaz; gerçek `MatchStatusBadge`+`getMatchStatusInfo`+`SystemMessageRenderer`
  yeniden kullanılır, `MessageBubble` bilinçli kullanılmaz). Z-katmanları: TourOverlay z-[9990],
  DemoChat z-[9980] (modallar 70 üstü, AnimatedSplash 9999 altı).
- `pages/customer/PitchBooking/demo/demoTourData.ts` — `DEMO_BUSINESS` (`demo-biz-dimli`),
  `DEMO_PITCH_ID`, `DEMO_TEAM` ("Örnek Takımım"), `isDemoId = id.startsWith('demo-')`.
  İnce dokunuşlar: "Tanıtım" pili, adres satırında "örnek işletme, rezervasyon kabul etmez",
  distanceKm yok (km rozeti çıkmaz), kapak `/Pitch.svg`.

**Entegrasyon noktaları (hepsi demo-kapılı):**
- `Register.tsx` CelebrationScreen `onDone`: `markTourPending('jokers') + startTour('pitches')`.
- `usePitchBooking.ts`: `filteredBusinesses` render'da `[DEMO_BUSINESS, ...businesses]` türetilir —
  state + `writeListCache` demo'yu HİÇ görmez (cache kirlenmesi yapısal imkânsız); ilan/rezervasyon
  fetch'lerinde `isDemoId` kısa devre; tur temizliği (modal kapat + akordeon kapa) kayıtlı.
- `PitchBooking.tsx`: tur aktifken `LocationAccessGate` bypass (`MaybeLocationGate`) — konum izinsiz
  yeni kullanıcı da demo kartı görür; `isAuthorized` override'ı YALNIZ demo karta.
- `PitchSchedule.tsx`: demo'da `isPast` hep false (gece de 20:00 tıklanır), Yol Tarifi/Ara görünür
  ama ETKİSİZ (Ara `tel:` yerine no-op buton).
- `CreateMatchModal.tsx`: `isDemo` dalı — `/users/me`+`getBusinesses`+rezervasyon istekleri atlanır,
  `myTeam=DEMO_TEAM`, varsayılan `kendi_aramizda`, submit'te POST YOK → `setDemoPhase('demoChat')`.
  Tur geçişleri event'le: `demo-create-modal-open`, `demo-ad-submitted` (yarış yok).
- `App.tsx`: `<TourHost/>` mount, `initTourFlags()`, Android geri tuşu turda = Atla onayı,
  RatingModal tur sırasında ertelenir. `JokerPool.tsx` mount'ta pending ise joker turu.
- `AccountSettings.tsx` + `TourReplayModal.tsx`: iki turu tekrar başlatma.

**İşletme tarafı (ileriki faz):** motor aynen; `TourId 'business'` + CongratulationsStep sonrası
ilk dashboard açılışında onay-bekliyor bandı / PitchGrid / tarih filtresi / Ayarlar hub'ı anlatılır
(demo varlık gerekmez).

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep `window.google`) + `vite build` ✓.
Client-only; sunucu/DB değişikliği yok; yeni native sürüm ister. Cihaz testi bekliyor: yeni kayıt →
tam akış, konum izni REDLİYKEN demo kart görünür, ağda `demo-` isteği sıfır (interceptor loglar),
`cached_businesses_v2` içinde `demo-biz-dimli` YOK, turda uygulamayı öldür → resume yok,
Ayarlar'dan iki tur tekrar izlenir, tur kapalıyken gerçek kaptan akışı birebir aynı.

### §75-v2 — Cihaz geri bildirimi sonrası yeniden tasarım (2026-07-12)

İlk cihaz testi geri bildirimiyle tur görsel katmanı ve kapsamı yenilendi:

- **TourTooltip SİLİNDİ → `TourSheet.tsx`**: tur kartı artık repo bottom-sheet dilinde
  (rounded-t-3xl + animate-slide-up + grab-handle + safe-area) EKRANIN ALTINA yapışık tam
  genişlik panel — sayfa üstte NET görünür (oyun tarzı anlatıcı paneli). Yükseklik `ref +
  ResizeObserver` ile GERÇEKTEN ölçülür; delik sheet alanına girerse sheet ÜSTE geçer
  (rounded-b-3xl + safe-area-top). Eski sabit `innerHeight-220` varsayımı (taşma hatasının
  kaynağı) silindi — taşma yapısal olarak imkânsız. Tipografi `clamp()` ile akışkan (JokerPool
  başlık deseni): ekran küçüldükçe font küçülür. Adımlara `icon` chip'i eklendi (içerik-önce).
  Ortalanmış modal KALDIRILDI: hedefsiz adımlar hafif karartma (0.55) + alt sheet; delikli
  adımlar 0.72.
- **Demo içerik zenginleşti**: kapak/saha görseli `client/public/demosaha.JPG` (1280×720
  gerçek saha fotoğrafı). `getDemoReservations/getDemoAnnouncements(selectedDate)` fikstürleri:
  18:00 DOLU (onaylı + sahte "Yıldız Spor" takımı), 19:00 ONAY BEKLİYOR, 21:00 RAKİP ARANIYOR
  (ilan → "BURADA RAKİP ARAYANLAR (1)" kartı da dolu), 20:00/22:00 BOŞ. slotTime cihaz-YEREL
  kurulur (`new Date(\`${date}T18:00:00\`)`) — PitchSchedule `getHours()` eşleşmesi.
- **Senaryo revizyonu (az yazı, aşamalı)**: maç türü adımı ikiye bölündü — `demo-type-rakip`
  ("Rakip bulmak için ilan yayınlanır. Maç Pazarı'ndan yakınındaki ilanlara da meydan
  okuyabilirsin.") + `demo-type-kendi`. Joker adım 2 hedefi tüm liste yerine İLK joker kartı
  (`joker-first-card`, index-0 sarmalayıcı) — koca-delik/taşma sorunu bitti.
- **YENİ Takım turu (`TourId 'team'`, 4 adım)** + **zincirleme**: Sahalar turunun son adımı
  (`p-go-team`, `onEnter:'close-demo-chat'` → DemoChat kapanır) alt menü TAKIM sekmesini
  (`nav-team`) spotlight'lar; dokununca `/team`'e gider ve `chainTo:'team'` ile Takım turu
  KESİNTİSİZ başlar (`advanceStep`: son adımda chainTo varsa endTour yerine startTour).
  Takım turu: `team-tabs` → `team-tab-takimim` (dokun) → `team-create-btn` (NoTeamView
  "Takım Kur") → bitiş. Tetik sigortası: Register `markTourPending('team')` de yazar —
  Sahalar turu atlanırsa /team ilk girişte TeamProfile mount tetiği başlatır. Anahtar:
  `tour_team_done_v1`. TourReplayModal'a "Takım Turu" eklendi. Onaylı bitiş metni artık
  Takım turunun son adımında.

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓. Cihaz testi
bekliyor: sheet hiçbir ekranda taşmaz, hedef alttayken üste flip, zincirleme akış kesintisiz,
demo slot çeşitliliği görünür, ağda `demo-` isteği sıfır.

### §75-v3 — İkinci cihaz testi düzeltmeleri (2026-07-12)

- **Kaydırma kilidi**: spotlight deliği dokunuşu alta geçirdiğinden kullanıcı listeyi kaydırıp
  hedefi ekran dışına çıkarabiliyordu. `TourOverlay` StepOverlay artık mount süresince
  document-level **non-passive** `touchmove` dinleyicisiyle (capture) kaydırmayı engeller;
  yalnız `[data-tour-sheet]` (TourSheet iç scroll'u) serbest. Delikten yalnız TAP geçer.
- **Karartma azaltıldı** (kullanıcı: sayfa içeriği görünsün): `DIM_SPOTLIGHT` 0.72 → **0.5**,
  `DIM_SOFT` 0.55 → **0.35**.
- **Sahalar turu 10 → 12 adım**: karşılama sonrası `p-explore` (hedefsiz — "yakınındaki
  sahaları keşfet; fiyat/yakınlık/müsaitlik/değerlendirmeye göre karşılaştır") +
  `p-filters` (hedef `pitch-filters` = PitchBooking sticky filtre çubuğu — yakınlık/tarih/
  sıralama ayarı). Yeni ikon anahtarı `'filter'` (SlidersHorizontal).

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓. Cihaz testi bekliyor.

### §75-v4 — Karartma sıfırlama + dummy içerik + joker davet simülasyonu (2026-07-12)

- **Karartma → parlatma**: `DIM_SOFT` (hedefsiz adımlar) tam şeffaf `rgba(0,0,0,0)` — sayfa
  NORMAL görünür, görünmez bloker yalnız dokunuşu engeller (İleri/Atla aktif); `DIM_SPOTLIGHT`
  **0.15**. Odak vurgusu artık karartma değil: delik her spotlight adımında `border-2
  border-turf-400` + dış ışıma `GLOW = 0 0 28px 6px rgba(74,222,128,0.45)` taşır.
- **DemoChat dummy mesajlar**: sistem balonlarından sonra `demo-chat-messages` sarmalayıcısında
  Oyuncu 1/Oyuncu 2 balonları (MessageBubble other-user sınıf reçetesi elle — gerçek bileşen
  native long-press yüzünden kullanılmaz). Sahalar turuna `p-chat-msgs` adımı ("Maçtan önce
  arkadaşlarınla maçın hikayesini burada yaz.") → **13 adım**.
- **Joker davet simülasyonu (jokers turu 4 → 7 adım)**: `DEMO_JOKER` ("Oyuncu 1",
  `demo-joker-1`) `useJokerPool.visibleJokers`'a render-türetilmiş prepend (state/cache görmez);
  akış: kart dokun → GERÇEK JokerDetailModal (saf sunum, sıfır API; `joker-invite-btn`) →
  Maça Davet Et → GERÇEK InviteJokerModal ama **isDemo dalı**: açılış `Promise.all`'u atlanır
  (sahte `getDemoInviteChannel()` = "Dimli Halı Saha — Ana Saha, 20:00" tek seçenek;
  `joker-demo-match`/`joker-send-invite` hedefleri), `executeSendInvite` demo'da POST YOK →
  gerçek "DAVET İLETİLDİ!" ekranı → 1.6s sonra kapan + `emitTourEvent('demo-joker-invited')`.
  **ÖNEMLİ**: davet POST'u jokerId'yi GÖVDEDE taşır — api.ts URL-interceptor'ı yakalayamaz,
  isDemo dalı bu yüzden zorunlu. Tur temizliği: useJokerPool `registerTourCleanup` ile
  detay+davet modallarını kapatır.

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓. Cihaz testi bekliyor.

### §75-v5 — İçerik derinleştirme + Yardım geri-tuşu düzeltmesi (2026-07-12)

- **Yardım/Destek geri-tuşu döngüsü DÜZELTİLDİ (tur dışı hata, §73 destek sayfaları):**
  müşteri `SupportPage.tsx` geri butonu `navigate('/settings/account')` ve işletme
  `BusinessSupport/components/SupportHeader.tsx` `navigate('/business/settings')` PUSH
  yapıyordu → geçmiş `[.., account, support, account]` olunca donanım geri tuşu Yardım'a
  "ileri" dönüyordu. İkisi de `navigate(-1)` (pop) yapıldı. KURAL: ayar alt sayfalarının
  sayfa-içi geri butonu HER ZAMAN `navigate(-1)` — rota push'u geri-döngüsü yaratır.
- **Karşılama karartması**: `TourStep.backdrop?: 'dark'` — hedefsiz adımda bloker 0.85
  karartır; YALNIZ `p-welcome` kullanır (kullanıcı kararı), diğer adımlar v4 parlaklığında.
- **Demo işletme 2 saha**: "1 Nolu Saha" (OUTDOOR ₺1200) + "2 Nolu Saha" (INDOOR ₺1400),
  15:00–24:00 **9'ar slot** (`buildDemoSlots`); PITCH TABS artık demo'da görünür.
- **Sahalar turu 13 → 16 adım**: karta dokun sonrası `p-pitch-tabs` (sekme geçişi) →
  `p-slots` → `p-facilities` (İMKANLAR) → `p-matches` (BURADA RAKİP ARAYANLAR) → 20:00...
  Yeni hedefler BusinessListItem'da isDemo-koşullu: `demo-pitch-tabs`, `demo-facilities`,
  `demo-active-matches`.
- **Dummy ilanlar**: rakip takım "Yıldız Spor" → **"Demo United"** (logoUrl '' — baş-harf
  avatarı) + "Demo City"; `getDemoAnnouncements` 3 ilan (bugün 21:00 + yarın 2 adet) →
  "BURADA RAKİP ARAYANLAR (3)" tarih gruplu dolu; rezervasyonlar: 16/18 DOLU, 19 ONAY BEKLİYOR.
- **DemoChat kapanış balonu**: "{{PARTY}} Maçtan sonra işletmeyi değerlendirmeyi unutma!"
- **Joker bitiş dipnotu**: "Joker davetlerini Takım İstekleri bölümünden toplu yönetebilirsin."

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓. Cihaz testi bekliyor.

### §75-v6 — Küçük cihaz düzeltmeleri (2026-07-12)

- **Delik yüksekliği tavanı (yapısal çakışma önleme)**: TourOverlay ölçümünde delik
  `top ≥ 8px` ve `height ≤ %50 ekran` — Rakip Arayanlar gibi uzun hedeflerde alt yarı
  sheet'e kalır, kart/spotlight çakışması hiçbir ekranda olamaz. Küçük hedefler etkilenmez.
- Demo ilan sayısı 3 → **2** (bugün Demo United 21:00 + yarın Demo City 20:00).
- Demo imkanlar: iki sahaya da Soyunma Odası + Kamera Kaydı + Krampon Kiralama eklendi.
- Metinler: p-slots "Sahanın müsaitlik durumunu buradan kontrol et..."; p-matches
  "Bu sahada rakip arayan takımları gör, onlara maç teklif et."

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓. Cihaz testi bekliyor.

### §75-v7 — Rakip Arayanlar kadrajı + TourSheet flip kilidi (2026-07-12)

- **Demo ilan 2 → 1** (yalnız bugün Demo United 21:00): "BURADA RAKİP ARAYANLAR (1)" bölümü
  başlık + tek kart boyutunda → spotlight tam istenen kadrajı çerçeveler (v6'nın %50-tavan
  deliği uzun bölümde kartları ortadan kesiyordu; tavan sigorta olarak duruyor).
- **TourSheet FLIP KİLİDİ**: alt/üst konum kararı artık türetilmiş değer değil — çakışma ilk
  tespitte `setFlipToTop(true)` ile KİLİTLENİR, adım boyunca geri dönmez (StepOverlay key'i
  adım değişince sıfırlar). Sınır durumdaki alt↔üst osilasyonu (Android joker 6. adım:
  kart yanıp sönüp dokunuşu tıkıyordu) yapısal olarak bitti.

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓. Cihaz testi bekliyor.

### §75-v8 — Maç Pazarı turu + Derin Takımım turu (2026-07-13)

**Maç Pazarı turu (`TourId 'marketplace'`, 10 adım):** `/` ilk ziyarette (Register
`markTourPending('marketplace')`). "Dimli United" demo ilanı (`getDemoMarketAd`) —
`useMarketplace.filteredMatches` memo'sunda render-türetilmiş prepend (tarih emniyet
filtresinden bağımsız; state/cache temiz). Kart tamamen ilan objesinden çizilir (kart başına
fetch yok). Akış: filtreler → demo kart ("Tanıtım" pili) → saha adı DOKUN → `BusinessInfoModal`
(isDemo kısa devre: fetch yok, DEMO_BUSINESS basılır) → kapat → takım adı DOKUN →
`TeamDetailModal` (isDemo: iki fetch de atlanır, zenginleştirilmiş DEMO_RIVAL_TEAM kadrolu) →
kapat → bitiş. `useMarketplaceActions.handleSubmitChallenge`'da isDemo guard'ı (id GÖVDEDE —
URL-interceptor yetmez). MaybeLocationGate bypass deseni burada da.

**Derin Takımım turu (21 adım, eski 4 adımlık senaryonun YERİNE):** REPLİKA DEĞİL — gerçek
MyTeam sayfasına render-türetilmiş demo takım enjeksiyonu: `MyTeam.tsx`'te `teamTourDemo =
activeTour==='team' && !demoTeamHidden` → `myTeam/roster/homeBusiness` shadow'lanır
(`getDemoMyTeam(currentUser)`: captainId = GERÇEK kullanıcı → kaptan-özel tüm kontroller
görünür; Oyuncu 2 hazır yrd. kaptan; shortId ORNEK-1). `fetchUser` gerçek state'i undefined'a
çekse bile görüntü bozulmaz; loading kapısı turda gevşer. Hook guard'ları:
`useMyTeam.fetchUpcomingMatches/fetchMatchHistory` (fikstür döner — /ratings/history URL'i
interceptor'a takılmadığından guard ŞART), `useTeamRequests` (dummy meydan okuma + Oyuncu 1'e
joker daveti — joker turuyla süreklilik), `AddPlayerModal` (arama/davet no-op + demo'da
autoFocus KAPALI — klavye açılmasın), `useTeamRoster` mutasyonları no-op,
`MatchHistoryModal.handleRatingSubmit` (POST yok → `applyRatingResult` yerel "Değerlendirildi"
+ `demo-rating-submitted` event'i; "Sonra"/skip de event'i atar — adım kilitlenmesin).
Akış: sekmeler → başlık kartı → TAKIM KODU chip'i → istatistikler → Yaklaşan Maçlar
(Kesinleştirildi fikstürü) → Takım İstekleri → Geçmiş Maçlar → Değerlendir → GERÇEK
RatingModal'da tam simülasyon → EV SAHİBİ SAHA → Oyuncu Ekle → davet linki paylaşımı →
yrd. kaptan satırı → FİNAL: `onEnter:'hide-demo-team'` (`TourState.demoTeamHidden`) → demo
kaybolur, NoTeamView'daki `team-create-btn` spotlight — "Şimdi sıra sende!" [Bitir].
Sahalar turundaki `p-go-team.chainTo:'team'` aynen zincirlenir.

Yeni data-tour-id'ler: marketplace-filters, market-demo-card/venue/team,
market-business-modal/close, market-team-modal/close; team-header, team-code, team-stats,
team-btn-upcoming/requests/history, team-upcoming-item/close, team-requests-list/close,
team-history-rate/close, team-rating-modal (RatingModal, koşulsuz), team-home-business,
team-add-player, team-invite-share, team-addplayer-close, team-player-vice.

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓. Cihaz testi
bekliyor. İşletme tarafı turu hâlâ ileriki faz.

### §75-v9 — Cihaz testi görsel revizyonları (2026-07-13)

- **TourSheet `compact` varyantı**: modal-içi adımlarda (m-demo-card, m-venue-in, m-team-in,
  t-upcoming-in, t-requests-in, t-requests-joker-in, t-rating, t-invite-link) kart TAM görünür —
  mini alt bar (≤150px: chip+sayaç+başlık+Atla satırı, gövde, İleri/ipucu), flip YOK; TourOverlay
  compact adımda delik tavanını %50 yerine `innerHeight - 170 - top` yapar.
- **Delik yatay clamp**: `left ≥ 8`, `right ≤ innerWidth-8` — tam genişlik hedeflerde (filtre
  çubukları) simetrik çerçeve.
- **Demo veri**: Dimli United kadrosu `name` alanıyla "Oyuncu 1/2/3" (TeamDetailModal `player.name`
  okur — isimsiz görünüyordu); renkler HEX (Dimli United lacivert #1e3a8a/#1e40af, Örnek Takımım
  koyu yeşil #14532d/#166534 — UpcomingMatchesModal gradyanı ham renk kullanır, toHex hex
  passthrough); DEMO_BUSINESS 4.7 (42 değerlendirme) + ownerPhone dummy (+90 312 000 00 00 —
  BusinessInfoModal'da düzgün Ara butonu) + `distanceKm: 7.42` her yerde sabit (Sahalar kartı,
  market ilanı, işletme modalı, kesinleşmiş maç).
- **UpcomingMatchesModal**: `match.distanceKm ?? koordinat-hesabı` (additive) + takım logo
  fallback'i tek harf → **2 harf** `name.slice(0,2).toUpperCase()` (takım kurulum default'u).
- **market-demo-team** hedefi isim butonundan takım başlık SATIRINA taşındı (logo dahil çerçeve).
- **Takım İstekleri joker sekmesi**: `team-requests-joker-tab` hedefi + 2 yeni adım (sekmeye dokun
  → Oyuncu 1 daveti anlatımı) — team turu 21 → **23 adım**.

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓. Cihaz testi bekliyor.

### §75-v10 — Üç ince görsel ayar (2026-07-13)

- **`TourStep.frame:'lines'`**: filtre adımlarında (p-filters, m-filters) dikdörtgen çerçeve
  yerine TAM GENİŞLİK delik + yalnız üst/alt 2px turf gradyan çizgi — yatay kaydırılan satırda
  kesik butonla ("İlanlarımı Gizle") kenar çizgisi çakışma algısı bitti.
- **Üste açılan kart da MİNİ**: TourSheet'te `flipToTop` artık compact mini düzeni ÜSTE yapışık
  render eder (`rounded-b-3xl` + safe-area-top) — "yukarıdan açılan modal" her yerde küçük,
  içerik kapanmaz. Büyük kart yalnız alt + kompakt olmayan adımlarda.
- **p-slots compact**: Saat Akışı adımı mini alt barla — 9 slot + saha sekmeleri tam görünür.
- **Dimli United kadrosu 3 → 2** (Oyuncu 3 silindi): takım kartı taşmadan sığar.

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓. Cihaz testi bekliyor.

### §75-v11 — Logo ortalama + joker başarı modalı + eğitim modu notları (2026-07-13)

- **Demo takım logosu**: TeamHeaderCard'da `isDemoId(myTeam.id)` → `object-contain p-2`
  (icon.png şeffaf kenarlı, cover kırpıp kaydırıyordu); gerçek takımlar object-cover aynen.
- **Joker davet başarı modalı YENİLENDİ** (gerçek + demo): CheckCircle+bounce yerine
  `ball-success.json` Lottie (loop=false; v12'de rolling-football'dan düzeltildi) — `onComplete` VE 2.5s emniyet zamanlayıcısı
  `closeSuccess()`'ı çağırır (idempotent, closedRef). Sabit 2000ms timeout kalktı.
- **Bayat spotlight düzeltmesi**: demo `executeSendInvite` event'i (`demo-joker-invited`)
  artık HEMEN atar → tur anında hedefsiz bitiş kartına geçer, donuk delik kalmaz; başarı
  animasyonu arkada temiz oynayıp kendiliğinden kapanır.
- **Eğitim modu dipnotları**: j-send "gerçek davet gönderilmez", p-submit "gerçek ilan
  yayınlanmaz", t-rating "değerlendirme kaydedilmez" + mini (compact/üst) düzene footnote
  satırı desteği eklendi.

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓. Cihaz testi bekliyor.

### §75-v12 — İki minik düzeltme (2026-07-13)

- Joker davet başarı animasyonu `rolling-football.json` → **`ball-success.json`** (yanlış
  dosya belirtilmişti; onComplete + 2.5s emniyet düzeni aynen).
- Demo takım logosu `p-2` → **`p-1`** (bir tık büyük, contain ortalaması aynen).

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓.

### §75-v13 — Joker başarı modalı: yalnız animasyon + tam süre (2026-07-13)

- `fallback={null}`: eski tik hiçbir koşulda (lazy chunk/JSON yüklenirken, reduce-motion'da)
  görünmez — yalnız ball-success animasyonu.
- Zamanlayıcı düzeni: kapanışın asıl tetikleyicisi `onComplete`; yedek zamanlayıcı
  reduce-motion'da 1.5s, normalde 8s (animasyon 3.27s — 2.5s'lik eski yedek ortadan
  kesiyordu, artık asla kesmez).

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓.

### §75-v14 — Demo logo kesin çözümü + Takım Ruhu metni (2026-07-13)

- **Demo takım logosu KESİN çözüm**: `DEMO_TEAM.logoUrl = ''` — TeamHeaderCard'ın yerleşik
  2-harf gradyan logosu ("ÖR", koyu yeşil) çizilir (takım kurulumundaki default logo);
  icon.png ve v11/v12'nin object-contain geçici çözümleri tamamen kaldırıldı (görsel
  kırpma/ölçek sorunu yapısal olarak imkânsız). TeamHeaderCard orijinal haline döndü.
- **TAKIM RUHU**: Takımım turunda bio override → "Sahaların yeni yıldızı"
  (getDemoMyTeam.description da aynı).

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓.

### §75-v15 — Takım turu finali: çift buton odağı + joker notu (2026-07-13)

- `team-create-btn` hedefi NoTeamView'da tekil butondan iki butonu ("Takım Bul" + "Takım Kur")
  saran konteynere taşındı — final spotlight'ı ikisini birlikte çerçeveler.
- t-finish dipnotu: "İstersen takım kurmadan, sadece joker modunu aktif ederek de maçlara
  katılabilirsin." + tekrar izleme bilgisi.

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓.

### §76. Maç Değerlendirme formu premium yenileme (2026-07-13)

`RatingModal.tsx` — Geçmiş Maçlar modalının tasarım diline çekildi (props/akış sözleşmesi ve
`data-tour-id="team-rating-modal"` aynen):
- Başlık: gradyan overlay + tintli ikon kutusu + font-sport clamp başlık; gradyan/ikon
  ADIM-DUYARLI (işletme sarı → fair-play yeşil, 500ms yumuşak geçiş). Panel animate-slide-up.
- RENK KURALI: **fair-play = YEŞİL** (turf — FairPlayScore ile tutarlı; eski indigo tamamen
  kalktı), **işletme = SARI**. Sekmeler, ikon çipleri, yıldızlar (StarRating color yellow/green)
  ve birincil buton (işletme adımı bg-yellow-500 text-slate-900 "Devam Et →", fair-play
  bg-turf-600 "Gönder") bu dile uyar; puan etiketi renk-uyumlu + seçimde fade-in.
- Tek adımlı akış (yalnız işletme/yalnız fair-play), businessDeleted dalı, Sonra Yap, adım
  kilidi aynen.

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓. Cihaz testi bekliyor.

### §77. Maç Kur formu: saat sıfırlama + Maç Pazarı tarih senkronu (2026-07-13)

- `CreateMatchModal` browse modunda işletme değişince (seçim + deselect) ve saha değişince
  `setTime('')` — önceki işletme/sahanın saati yeni seçimde geçersiz/dolu olabilirdi (saat
  listesi zaten dinamik: TimeSelectionModal seçili sahanın timeSlots'ından üretir).
- `Marketplace` FAB'ı `preSelectedDate={selectedDate}` geçirir — form sayfadaki seçili
  tarihle açılır (modal açılış efekti setDate(preSelectedDate || bugün)).
- Sabitlenmiş akışlar (Sahalar slot dokunuşu / Ev Sahibi Saha) ve tur demo akışı etkilenmez.

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓.

### §78. Paylaşılan Toast + Takım Ayarları premium yenileme + ana renk preset'leri (2026-07-13)

- **YENİ `components/UI/Toast.tsx`** — uygulamanın İLK paylaşılan toast'ı: `fixed z-[70]`,
  `top: calc(env(safe-area-inset-top) + 72px)` (alt navbar'dan bağımsız), Check/X ikonlu,
  clamp metin. KURAL: sayfa-içi inline toast konumlandırma YASAK — bu bileşeni kullan.
  Geçirilenler: UserProfile (bottom-24 navbar arkasında kalıyordu) + TeamSettings (top-20
  başlıkla çakışıyordu). MyTeam'inki (top-24, çalışıyor) ileride taşınabilir.
- **Takım Ayarları**: sağ üst Kaydet KALDIRILDI (tek kayıt noktası: alt buton);
  `useTeamSettings`'e dirty takibi (initialRef anlık görüntüsü, logo hariç — logo zaten
  anında PATCH'lenir; başarılı kayıtta tazelenir). UI: değişen bölümlerde amber
  "Kaydedilmedi" pili (Takım Kimliği / Takım Renkleri), alt buton durum-duyarlı
  (!isDirty → pasif "Kaydedilecek değişiklik yok"; isDirty → amber "Kaydedilmemiş
  değişikliklerin var" notu + aktif turf buton); içerik pb'sine safe-area-bottom.
- **TEAM_COLORS yenilendi** (tek kaynak ColorPickerModal — TeamSettings ana+ikincil ve
  CreateTeamModal otomatik): ANA RENKLER önde (Siyah #1a1a1a, Beyaz, Lacivert #1e40af,
  Sarı, Kırmızı, Yeşil, Bordo #9f1239, Mavi) + 16 destek rengi (24, 8×3). Koyu tonlar
  sohbette `ensureReadableOnDark` ile açılır (önizleme canlı sonucu gösterir, kayıt ham
  renktir); çiplere `ring-1 ring-white/10` (siyah/beyaz koyu zeminde seçilebilir).

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓. Cihaz testi bekliyor.

### §79. Android konum arızası — native hata sınıflandırması + watch fallback (2026-07-13)

**Belirti:** Android'de Maç Pazarı/Sahalar/Joker "Konumunuz alınıyor..." → "Tekrar Dene"
döngüsü; iOS sorunsuz. **Kök neden (2 katman):**
1. **KALICI KURAL — Capacitor native plugin hataları W3C numeric code TAŞIMAZ** (yalnız web
   implementasyonu taşır). Android Geolocation reject'leri düz string'dir: "location
   unavailable", "location disabled", "Google Play Services not available"; konum ana
   anahtarı kapalıyken checkPermissions bile durum döndürmek yerine "Location services are
   not enabled" ile REJECT eder. LocationContext catch'i err.code===1/2/3'e baktığından
   Android'deki HER hata 'timeout'a düşüyor, gps_disabled/denied kartları cihazda hiç
   çıkmıyordu. → Mesaj-tabanlı sınıflandırma eklendi (denied / not enabled / location
   disabled / location services / play services); numeric code yolu web için duruyor.
2. Fused getCurrentLocation soğuk fix/iç mekânda null dönebiliyor ("location unavailable",
   bilinen issue #683 ailesi). → `getPositionRobust` üç adım oldu: düşük doğruluk
   (maximumAge 60sn→180sn — bayat fix kabul, ilçe kapısı >250m zaten) → yüksek doğruluk →
   **watchFirstFix(10sn)** son çaresi (İLK fix'te clearWatch; kurtarılamaz hatalarda —
   isUnrecoverableGpsError — atlanır). checkPermissions reject'i de kendi try/catch'inde
   gps_disabled'a yönlendirilir.

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓. Android cihaz
testi bekliyor: konum anahtarı KAPALI → "Konum Servisleri Kapalı/Ayarlara Git"; AÇIK + iç
mekân → watch fallback fix; izin reddi → izin kartı; iOS regresyonsuz.

### §75-v17 — Modal spotlight çakışması: panel sığdırma (2026-07-13)

Kök: m-venue-in / m-team-in adımlarında delik modal PANELİN TAMAMINI hedefler; panel kompakt
kart rezervinden uzunsa delik tavanı çerçeve çizgisini içerikten geçiriyordu (Krampon Kiralama
alt satıra düşünce, dar ekranda Oyuncu 2 satırı). **Yapısal çözüm:** demo'da panel tur
kartının üstündeki alana sığdırılır — backdrop `paddingBottom:176` + panel
`maxHeight: calc(100vh - 208px)` (BusinessInfoModal + TeamDetailModal, isDemoId koşullu;
TourOverlay COMPACT_RESERVE=170 ile uyumlu). Delik gerçek panel kenarını sardığından çizginin
içerikten geçmesi geometrik olarak imkânsız; uzayan içerik panel içi kaydırmaya düşer.
+ Genel düzeltme: TeamDetailModal içerik kolonuna `flex-1 min-h-0` — panel overflow-hidden
flex-col olduğundan bu olmadan GERÇEK modalda da küçük ekranda içerik kaydırılamıyordu.

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓. Cihaz testi bekliyor.

### §75-v18 — İşletme kartı: imkanlar tam görünür (2026-07-13)

v17 panel küçültmesi sonrası, sabit alt buton şeridi (Ara/Yol Tarifi) hep görünürken
imkanlar kaydırma altında kayboluyordu. Demo-koşullu kompaktlaştırma (gerçek modal aynen):
kapak h-40→h-28, buton şeridi p-3 + paddingBottom 12 (panel ekran dibinde değil — safe-area
gereksizdi), DEMO_BUSINESS.address kısaltıldı ("Örnek işletme — rezervasyon kabul etmez.").
~90px kazanç → 6 imkan rozeti butonların üstünde kaydırmasız görünür; iç kaydırma çok küçük
ekranlar için güvenlik ağı olarak kalır, çerçeve v17 gereği panel kenarında.

Doğrulama: `tsc --noEmit` (yalnız önceden var LocationStep) + `vite build` ✓. Cihaz testi bekliyor.

### §80. Davet (promo) kodu ile ücretsiz işletme aboneliği (2026-07-15)

**Amaç:** İlk ~20 işletmeye tamamen ücretsiz erişim. Store offer code / RevenueCat
promotional entitlement KULLANILMADI — abonelik durumunun kaynağı zaten sunucudaki
`subscriptions` tablosu; store kodları süresiz ücretsizliği desteklemez. Tamamen kendi
sunucu-tarafı kod sistemi kuruldu.

**Veri modeli:**
- Yeni `promo-codes/` modülü: `promo_codes` (code `DIMLI-XXXXXXXX`, durationMonths null=süresiz,
  maxRedemptions/usedCount, isActive, expiresAt) + `promo_code_redemptions` (denetim izi,
  unique (promoCodeId, ownerId)).
- `subscriptions` enum'a `COMPLIMENTARY` + kolonlar `complimentaryUntil` (null=süresiz),
  `complimentaryReminderSentAt`, `promoCodeId`. Flag değil enum — webhook guard/cron/rozet tek
  alandan okur.

**Kritik kararlar:**
- **Webhook guard (subscription.service.ts handleWebhook):** `status===COMPLIMENTARY` ise TÜM
  RC event tipleri atlanır. Mevcut işletme kod kullandıktan sonra store aboneliği hâlâ
  RENEWAL/EXPIRATION üretebilir; RENEWAL statüyü ACTIVE'e çevirip sonraki EXPIRATION erişimi
  öldürürdü. Ücretliye dönüş tek yoldan: confirm-purchase (complimentary alanlarını temizler).
- **Yeni kayıtta IAP atlanır** (useBusinessRegister handleSubmit: promoApplied → purchasePlan +
  linkRevenueCatUser ATLANIR). RC ID hiç oluşmaz → webhook eşleşmesi asla kurulmaz (doğal koruma).
  Redeem, kayıt transaction'ı İÇİNDE (auth.service, commit öncesi) — atomik; geçersiz kod tüm kaydı
  rollback eder.
- **Atomik tüketim (yarış):** koşullu UPDATE `usedCount=usedCount+1 WHERE usedCount<maxRedemptions`
  → affected!==1 ise ConflictException. Postgres satır kilidi eşzamanlı kaydı serileştirir.
- **Süre dolumu:** genel trial-expiry cron'u sunucuda YOK; SubscriptionService'e saatlik
  `@Cron` eklendi (complimentaryUntil<=now → EXPIRED + bildirim; 7 gün kala tek hatırlatma). Yalnız
  Subscription+Notification repo → SubscriptionModule yaprak kalır.
- **Store aboneliği programatik iptal EDİLEMEZ:** mevcut işletme redeem sonrası native'de
  StoreCancelPromptModal + mevcut `openStoreSubscriptions()` helper'ı ile kullanıcı kendi iptal
  eder; iptal etmese bile webhook guard sistemsel zararı önler (yalnız kullanıcı ödemeye devam eder).
- **Apple 3.1.1 dili:** client UI'da yalnız "davet/partner kodu / erişim" — kupon/indirim/ödeme
  YASAK. App Review notu: "partner onboarding invitation codes, not sold".
- **Modül zinciri:** Auth/Admin → PromoCodes → Subscription (döngüsüz; SubscriptionModule yaprak).
  Public `/promo-codes/validate` auth'suz + PromoThrottlerGuard (named 'promo' 10/dk, enumeration
  koruması). Admin CRUD admin.controller'da AdminJwtAuthGuard.
- **Status gate'leri** (`['active','trial','complimentary']`): BusinessDashboard, useBusinessAddPitch,
  useBusinessPitchList, useBusinessSubscriptionSettings.

**Admin panel:** yeni PromoCodesPage + usePromoCodes (usePaginatedList), kod üret/listele/deaktive,
üretilen kod kopyalama modalı, redemption listesi. IconTicket + route + sidebar.

**Doğrulama:** 3 pakette build + server lint temiz. Canlı DB'de riskli enum ALTER önceden manuel
uygulandı (`ALTER TYPE subscriptions_status_enum ADD VALUE 'complimentary'` ✓) — deploy'daki
synchronize enum'u tam görüp yeniden yaratmayacak, yalnız yeni tabloları + nullable kolonları
ekleyecek. Deploy sırası: server → client-admin → mobil (yeni native build + store inceleme).
Kod alanı yalnız yeni binary'de; sunucu eski istemcileri değiştirmeden kabul eder. Cihaz testi +
uçtan uca akış (kayıt/redeem/cron/webhook) deploy sonrası bekliyor.

---

### §81. Basılı afiş QR kodu + cihaza göre mağaza yönlendirmesi (2026-07-17)

**Amaç:** A5 basılı afişteki tek QR kod, okutan kişiyi iPhone ise App Store'a, Android ise
Play Store'a atsın.

**Temel kısıt:** QR kod sabit metin taşır, içinde mantık çalıştıramaz — "hangi telefon?"
kararını QR veremez, hedef sunucu verir. Firebase Dynamic Links / Branch.io gibi servislerin
yaptığı da budur (Dynamic Links Ağustos 2025'te kapandı). Site zaten elimizde olduğu için
üçüncü parti servis kullanılmadı.

**Akış:** QR → `https://www.dimli.com.tr/qr` → `web/app/qr/route.ts` User-Agent'a bakar → 302.
**`www.` şart:** apex `dimli.com.tr` Vercel'de www'ya 307 atıyor; www'suz QR her okutmada
fazladan bir durak demek. "www." QR sürümünü büyütmüyor (37×37 aynı) — bedava.
- `/iPhone|iPad|iPod/i` → `APP_STORE_URL`
- `/Android/i` → `GOOGLE_PLAY_URL` (+ `?k=` varsa Play `referrer` param'ı)
- diğer → `/indir` (iki rozetin de olduğu mevcut sayfa)

Mağaza URL'leri `web/components/StoreBadges.tsx`'ten **import edilir**, kopyalanmaz (tek kaynak).

**İki zorunlu detay — atlanırsa afiş sessizce bozulur:**
1. `export const dynamic = 'force-dynamic'` — Next 14'te GET Route Handler varsayılan olarak
   STATİK değerlendirilir; UA'ya bakan uç statik olursa ilk cevap herkese servis edilir.
   Build çıktısında `/qr` mutlaka `ƒ (Dynamic)` görünmeli, `○ (Static)` değil.
2. **302 + `Cache-Control: no-store`** — CDN bir iPhone'a verilen App Store yönlendirmesini
   önbelleğe alırsa Android kullanıcıları da App Store'a düşer. 301 asla kullanılmaz.

**Bakım modu:** `web/middleware.ts` matcher'ında `/qr` muaf tutuldu (`.well-known` ve `invite`
gibi). Basılı afiş geri çağrılamaz — bakım modu QR'ı öldürmemeli. **`/qr` yolunun adı afiş
basıldıktan sonra ASLA değiştirilemez.**

**Kampanya etiketi:** `/qr?k=<etiket>`, `[a-z0-9_-]{1,32}` ile doğrulanır (ham girdi mağaza
URL'ine sızmaz). Play Console Kazanım raporunda görünür. App Store karşılığı (`pt`/`ct`)
App Store Connect kurulumu istediği için eklenmedi.

**Afiş:** `marketing/` (poster-a5.html + dimli-qr.svg + dimli-lockup.svg + gen-lockup.cjs +
phone-sahalar.png + poster-a5.pdf + README). Detaylı kurallar `marketing/README.md`'de. Özet: QR
beyaz kartta koyu modül (yeşile basılmaz), ~48.6mm görünen kenar, `box-shadow` yok (PDF'te opak gri
dikdörtgen basılıyor), üst yarı canlı yeşilde lacivert metin / alt yarı koyu yeşilde beyaz metin
(yeşili tüllemek çamurlaştırıyordu). QR SVG'sinin viewBox'ı 4 modüllük sessiz alanı zaten içerir —
görünen QR, svg genişliğinin 29/37'si.

**Afiş tipografisi (2026-07-17 yeniden tasarım):** Anton (başlık) + Inter (gövde). Asıl sorun
tipografi değil hiyerarşi yokluğuydu — poster kuralı tek baskın mesajın görsel ağırlığın ~%70'ini
taşıması; 180 karakterlik paragraf başlık + alt başlık + 4 çipe bölündü. Başlık
"HALISAHANIN HİKAYESİ / DİMLİ'DE BAŞLAR", her satır kenardan kenara (126mm).
Öğrenilen tuzaklar:
- **Başlık puntoları ölçülür, tahmin edilmez.** Anton headless Chrome'da ölçüldü (100px'te
  820.2px / 622.8px) → 15.37mm / 20.24mm. Başlık metni değişirse yeniden ölçülmeli.
- **`line-height: 1`'in altına inilmez** — Anton'un İ noktaları cap yüksekliğinin üstüne çıkıyor,
  0.86'da satırlar çakışıyordu.
- **Türkçe büyük harf CSS ile YAPILMAZ** (`text-transform` yerel ayara bağlı, i→I mi İ mi) —
  metin HTML'e hazır büyük harf yazıldı.
- **`overflow: hidden` taşmayı sessizce yutuyor**, PDF yine "tek sayfa" diyor. İlk denemede içerik
  220.3mm/210.1mm'ydi, `dimli.com.tr` kırpılmıştı. Gerçek kontrol: alt satır görünüyor mu.
- **Logo = `client/public/dimli.png`** (2026-07-17 rev.2, `marketing/dimli-logo.png` kopyası):
  parlak lime D + düz "DİMLİ", kendi koyu stadyum zemini ile. Yuvarlatılmış kare plakada,
  **dolgusuz** — görselin kendi zemini olduğu için dolgu koyunca dikiş oluşuyor.
  `transform: scale(1.18)` ŞART: logo görselin yalnız %42 genişliğini / %58 yüksekliğini kaplıyor
  (ölçüldü: bbox 435×597 / 1024×1024), 1:1'de plakada kayboluyor; logo tuvalde tam merkezde
  (512,511) olduğu için ortadan büyütmek güvenli. Eski `dimli-mark.png` (icon.png kırpımı) silindi.
  - **Alternatif (üretildi, şu an kullanılmıyor):** `dimli-lockup.svg` = açılış animasyonunun
    durağan son karesi (el yazısı DİMLİ). `gen-lockup.cjs` vektörleri `AnimatedSplash.tsx` +
    `splashWordmark.ts`'ten **okuyup** üretir (elle kopyalama yok: ~10KB bezier).
  - **Tuzak (lockup kullanılırsa):** `WORDMARK_DOT_REVEALS` ve `mask="splash-pen-reveal"` içindeki
    `m1`-`m9` **artwork değil**, kalem-süpürme animasyon geometrisi — çizilmez. İ noktaları zaten
    harf path'lerinde baked. Harfler hem `fill` **hem** 4 birim `stroke` ile çizilir, yoksa incelir.
    Splash yeşili `#2f8a22` koyudur ve laciverte göre tasarlanmıştır; canlı yeşilde kaybolur.
- **Çerçeveler afişin en kritik öğesi** (afiş sahalara asılıyor; oyuncu uygulamayı onları okuyarak
  anlıyor): tam genişlik lacivert satırlar + beyaz kalın metin + yeşil nokta. Yer açmak için alt
  başlık atıldı (çerçeveler aynı işi daha iyi yapıyordu). CTA/rozetler/ÜCRETSİZ, QR'ın altına sağ
  kolona alındı — sahnede QR'ın yanındaki ~14mm boş dikey alanı kullanır ve ekran görüntüsünün
  40×85mm (düz, kırpılmamış) kalmasını sağlar. `.stage`de `align-items: flex-start` — QR kartının
  üst kenarı telefonunkiyle birebir hizalı (`center`da sağ kolon uzun olduğu için QR yukarı
  kayıyordu). QR ile çerçeveler arası 2mm boşluk korunmalı.
- **"ÜCRETSİZ" eklendi** — uygulama oyunculara ücretsiz ama afişte hiç yazmıyordu; sahada afişi
  gören kişinin ilk sorusu "para mı?" oluyor.
**Doğrulama (CANLI ✓):** Yerel 6 UA senaryosu geçti (iPhone/iPad→App Store, Android→Play,
masaüstü→/indir, `?k=saha1`→referrer, `?k=<script>`→temizlendi; hepsi 302 + no-store).
Build temiz, `/qr` = ƒ (Dynamic). Commit `4d06511` main'e push'landı, Vercel deploy indi.
**Canlı doğrulandı:** üç senaryo da doğru; CDN önbellek testi 8 dönüşümlü istekte temiz
(iPhone hep App Store, Android hep Play — zehirlenme yok). Uçtan uca: basılmış PDF'ten jsQR ile
okunan URL (`https://www.dimli.com.tr/qr` ✓, 300/500/700px; yeniden tasarım sonrası 4/4) gerçek isteklerle takip edildi →
iPhone'da Apple `itms-appss://`'e çeviriyor (App Store uygulaması açılıyor), Android'de Play 200.
**Kalan: tek deneme baskısı + gerçek telefonla kâğıttan okutma — toplu baskı öncesi zorunlu.**

**Bulunan ilgisiz açık:** `web/public/.well-known/assetlinks.json` parmak izi hâlâ
`REPLACE_WITH_RELEASE_KEYSTORE_SHA256_FINGERPRINT` → Android App Links doğrulanmıyor, takım
davet linkleri Android'de uygulama yerine tarayıcıda açılıyor. QR akışını etkilemez (QR zaten
tarayıcıda açılmalı), ayrı iş.

### §82. Takım durumu senkronu: kaptan uyarısı gecikmesi + takım-olayı yayını (2026-07-17)

**Belirti:** Yeni kullanıcıyla takım oluşturunca Maç Pazarı'nda "Sadece Kaptan ve
Yardımcıları" kilidi bir süre kalkmıyordu. Kök neden tekil bug değil sistemik eksiklik:
HİÇBİR takım üyeliği mutasyonu ortak `currentUserStore`'u güncellemiyordu (store yalnız
30sn TTL / 8dk keepalive / reconnect / LocationContext seed'iyle tazeleniyordu). Bayat
`currentUser.team`: Maç Pazarı `canChallenge`, Sahalar `isAuthorized`, Bildirimler
`isTeamLeader`, Chat kaptan aksiyonları (+ iptal isteğinde bayat `team.id` gönderimi).

**Çözüm (full-stack, deploy sırası server→client):**

*Server:*
- 3 yeni bildirim tipi: `TEAM_ADDED` (doğrudan ekleme), `TEAM_ROLE_CHANGED`
  (metadata.role: CAPTAIN|VICE|MEMBER), `TEAM_DELETED`. `notifications.type` kolonu düz
  varchar (canlı DB'de doğrulandı) → migration/ALTER GEREKMEDİ.
- `notifications.service.ts`: `createPlayerAddedNotification` / `createRoleChangedNotification`
  / `createTeamDeletedNotification` (createPlayerRemovedNotification deseni: DB + socket + push).
  `createTeamDeletedNotification` ad+üyeIds parametre alır (takım çoktan silinmiş olur).
- `teams.service.ts` `updatePlayerRole`/`updateViceCaptains`: `return save(team)` →
  `await save; return findOne(teamId)`. KRİTİK: kaptanlık devrinde save() dönüşündeki
  `captainId` skaleri devir ÖNCESİ değeri taşıyabiliyordu (yalnız captain ilişkisi atanıyor);
  client yanıtı store'a seed ettiği için yanıt kanonik olmak zorunda.
- `teams.controller.ts`: `assertTeamManager` guard'ı — `addPlayer` (kaptan+yardımcı),
  `updatePlayerRole`/`updateViceCaptains` (yalnız kaptan). GÜVENLİK: bu endpoint'lerde daha
  önce HİÇ requester kontrolü yoktu (§65 denetiminden kaçmış — herhangi bir oturumlu kullanıcı
  herhangi bir takımda rol değiştirebiliyordu). `deleteTeam`: silmeden önce ad+üye listesi
  yakalanıp silme sonrası kalan üyelere TEAM_DELETED. Bildirimler `.catch(() => {})` best-effort.
- `users.service.ts` hesap silme kaptanlık devri → `notifyNewCaptain` (TEAM_ROLE_CHANGED).
  DI: NotificationsService ENJEKTE EDİLMEDİ (Users→Notifications→Teams→Users döngüsü,
  purgeTeamRaw raw-SQL kararıyla aynı gerekçe) → eldeki `notificationRepository` + döngüsüz
  `GatewayModule`/`FirebaseService` ile doğrudan yazılır (metinler NotificationsService
  CAPTAIN dalıyla senkron tutulmalı).

*Client:*
- **Kendi aksiyonlarına satır içi seed** (`seedCurrentUser({team: <tam findOne şekli> | null, teamId})`):
  oluşturma/ayrılma/silme (`useMyTeam`), davetle katılım (`TeamInvite`), yardımcı atama-alma +
  kaptanlık devri (`useTeamRoster` — devirde ek `fetchCurrentUser({force:true})` sigortası:
  eski sunucu bayat captainId dönebilir), açıklama/ev-sahibi (`useMyTeam`), logo/ad/seviye/renk
  (`useTeamSettings` — PATCH yanıtları önceden çöpe atılıyordu). KURAL: store'a asla parça team
  seed etme (seed TTL'i sıfırlar, eksik şekil 30sn "taze" sayılır).
- **`client/hooks/useTeamEventsSync.ts`** (AppContent'te bir kez): socket 'notification'
  tipi {TEAM_KICKED, JOIN_REQUEST_ACCEPTED, TEAM_ADDED, TEAM_ROLE_CHANGED, TEAM_DELETED}
  ise `fetchCurrentUser({force:true})` + `window 'team:changed'` yayını. Ek: her socket
  'connect'te bir kez zorla tazele (iOS arka planda socket askıya alınır, kaçan emitler
  resume'da telafi edilir).
- **`client/hooks/useOnTeamChanged.ts`**: useOnReconnect emsali ('team:changed'); MyTeam
  `fetchUser`'ı buna bağlandı (MyTeam store'a abone DEĞİL — snapshot-once, köprü şart).
- **`currentUserStore.fetchCurrentUser`**: in-flight varken gelen `force` isteği artık
  yutulmaz — mevcut istek bitince zorla bir tur daha atılır.
- **Maç Pazarı `permissionsReady`** (`currentUser != null`): soğuk açılışta kartlar
  localStorage cache'inden user'dan ÖNCE basılır → kilit yerine buton yüksekliğinde nötr
  `animate-pulse` iskelet (`MatchAnnouncementCard`; demo kart hariç).
- Bildirim görselleştirme: 3 yeni tip için NotificationItem ikon/renk/başlık dalları;
  push tıklaması TEAM_ADDED/TEAM_ROLE_CHANGED → `#/team`.

**Geriye uyumluluk:** Eski client + yeni server → yeni tipler genel dinleyicilere düşer
(rozet+liste), NotificationItem bilinmeyen tipi varsayılanla basar. Yeni client + eski
server → seed'ler çalışır, 3 yeni tip gelmez, devir sigortası bayat captainId'yi örter.

**Doğrulama:** server nest build + boot (tüm modüller DI hatasız) ✓; client vite build +
tsc (dokunulan dosyalar temiz) ✓; canlı DB'de `notifications.type` varchar doğrulandı
(salt-okunur sorgu). İki cihazlı senaryo testleri + yeni native sürüm YAYINI BEKLİYOR.

**Not:** Aynı batch'te §-siz küçük iş: Maç Pazarı + Joker pull-to-refresh düzeltmesi
(`handleTouchEnd` `requestLocation()` → `refetch()` force; `useMarketplace.refetch` artık
promise döndürür — spinner fetch bitene dek döner). Sahalar/Chat zaten force çekiyordu.

### §83. Sahalar: saha geçişinde bayat slot durumu flaşı (2026-07-17)

**Belirti:** İşletme detayında 1↔2 nolu saha hızlı geçişinde önceki sahanın slot
durumları (DOLU / RAKİP ARANIYOR / ONAY BEKLİYOR) yeni sahada <1sn görünüp düzeliyordu.

**Kök neden (3 katman):** (1) Saha değişiminde `pitchAnnouncements` + `reservations`
state'leri TEMİZLENMİYORDU — `set...([])` yalnız "saha seçili değil" else-dalındaydı;
yeni yanıt gelene dek eski sahanın verisi çiziliyordu. (2) İki fetch'te de yarış koruması
yoktu (hızlı A→B→A'da geç gelen eski yanıt yenisini ezebilir). (3) `PitchSchedule`
ilan/rezervasyonu yalnız tarih/saate göre eşliyordu — pitchId bakmıyordu.

**Çözüm (`usePitchBooking.ts` + `PitchSchedule.tsx`):**
- İlanlar effect'i: geçerli-saha dalında (demo dalı sonrası) senkron `setPitchAnnouncements([])`
  + `cancelled` bayrağı ve cleanup (myChallenges emsali).
- `refetchReservations`: `lastScheduleKeyRef` (`pitchId|date`) — anahtar değişince senkron
  `setReservations([])`, AYNI anahtarla refresh'te (teklif sonrası) temizleme YOK (boş-flaş
  olmasın); `reservationsGenRef` jenerasyon sayacı — effect DIŞINDAN da çağrıldığı için
  cancelled-bayrağı yerine fetchGenRef emsali; await sonrası gen eşleşmezse yanıt atılır.
- `PitchSchedule` ilan filtresi: toleranslı pitchId savunması
  (`!announcement.pitchId || announcement.pitchId === selectedPitch.id`) — sunucu
  `/match-announcements/pitch/:id` zaten pitchId'li döner; demo ilan DEMO_PITCH_ID taşır
  (demo saha 2'de yanlış görünme de düzeldi). Rezervasyonlara filtre YOK (nesneler güvenilir
  pitchId taşımıyor) — koruma anahtar-temizliği + sayaç. `key={pitch.id}` remount BİLİNÇLİ
  eklenmedi (scroll/animasyon sıfırlama yan etkisi).

**Doğrulama:** tsc + vite build temiz. Cihaz testi bekliyor: hızlı 1↔2 geçişte yanlış durum
flaşı yok; aynı sahada teklif-sonrası refresh boş-flaş yapmıyor; tanıtım turu bozulmadı.

---

### §84. Tek seferlik canlı DB işlemi — Hasbahçe 18 Temmuz Cumartesi sabit rezervasyon backfill (2026-07-18, kullanıcı onayıyla — §9 istisnası)

**Durum:** Hasbahçe Halısaha (`pitchId=e452c528-ee0f-4ded-8c34-6690cd080399`) sahibi 2026-07-18
10:32–10:33'te 5 Cumartesi + 4 Cuma `recurring_closures` (sabit/sürekli kapatma) tanımladı. Kuralı
oluştururken tıklanan ilk slot **25 Temmuz** olduğundan materyalizasyon (bkz. §14, §61:
`reservation-recurring.service.computeWeeklyOccurrences` yalnız ileriye üretir; kural tablosunda
`startDate` YOK) 25 Temmuz'dan ileri gitti → **içinde bulunulan haftanın Cumartesi'si (18 Temmuz)
materyalize edilmedi**, müşteride BOŞ görünüyordu.

**Yapılan (kullanıcı açık talimatı):** 5 Cumartesi kapatma satırının 25 Temmuz haftası
materyalizasyonu **birebir klonlanıp** `slotTime −7 gün` ile 18 Temmuz haftasına eklendi (`reservation`
tablosuna 5 INSERT; yeni `id`+`createdAt`, diğer tüm kolonlar aynen: `status=APPROVED`, `type=DIRECT`,
`teamId=NULL`, ilgili `recurringClosureId`). Kural tablosuna (`recurring_closures`) DOKUNULMADI. Cuma
kapatmaları ve 25 Temmuz+ dokunulmadı. Klonlanan 5 kural: `40d9ab60`(Cts 00:00), `36c42153`(18:00),
`c40b5d7a`(19:00), `05602313`(21:00), `b7a8949c`(23:00).

**Emniyet:** transaction + DO-blok assert (kaynak=5, hedef pencere boş=0; değilse rollback),
`ON_ERROR_STOP=1`. Sonuç `INSERT 0 5` + COMMIT. Doğrulama (salt-okunur): her kural için jul18=1 &
jul25=1 (birebir parite), Cuma penceresi 0.

**Not:** 18 Temmuz 00:00 (gece yarısı) slotu o an geçmiş → client'ta GEÇTİ; 18:00/19:00/21:00/23:00
SABİT görünür. Bu **tek seferlik** bir durumdu (kural bugün kuruldu, mevcut hafta Cumartesi'si bugün);
kök-neden kod düzeltmesi (erken çıpa / okumada kural overlay) tek haftalık boşluk için gereksiz görülüp
yapılmadı. Bağlantı dizesi hiçbir yere yazılmadı (§9).

---

### §85. Sabit rezervasyon takım ataması + abone chat'i (SUBSCRIPTION kanalı) (2026-07-18)

> **İhtiyaç:** İşletme bir saati "sürekli kapat" ile doluya çevirdiğinde o saate fiilen abone olan
> takımın uygulamada hiçbir chat'i olmuyordu (kapatma = takımsız APPROVED reservation, §14). Artık
> işletme sabit kapatmaya **takım kodu (shortId, ABC-123) girerek** takım atayabiliyor (tek takım
> veya rakipli çift takım → **tek ortak kanal**) ve atanan takım(lar) için **kalıcı abone chat'i**
> otomatik açılıyor. Onay akışı yok; işletme atamayı kaldırana kadar kanal açık kalır.

**Veri modeli:**
- `recurring_closures` + `teamId`, `opponentTeamId` (nullable, `ManyToOne(Team, SET NULL)`).
  Tek takım = yalnız `teamId`; rakipli = ikisi de dolu.
- `chat_channels` + **yeni tip `SUBSCRIPTION`** (union'a eklendi, varchar — migration yok) +
  `relatedClosureId` kolonu **gerçek FK** ile: `ManyToOne(RecurringClosure, CASCADE)`.
  `relatedMatchId`'nin FK'sız varchar olması §45'teki yetim kanal acısının köküydü; burada kural
  silinince kanal → (mevcut CASCADE'lerle) katılımcı+mesaj zinciri otomatik temizlenir.
  **`relatedMatchId` SUBSCRIPTION'da hep NULL** → `getChannelMatchStatusType` null döner → oynanmış/
  oynanmamış mesaj kilidi bu tipe hiç dokunmaz (chat ban yine geçerli).

**Server:**
- `reservation-recurring.service`: `assignTeamToClosure(closureId, ownerId, teamShortId, opponentTeamShortId?)`
  (kod regex `^[A-Z]{3}-\d{3}$` + `UPPER(short_id)` birebir sorgu — tüm takımlar asla listelenmez;
  aynı-kod 400, bulunamayan 404, `scheduledDeletionAt/deletedAt` dolu saha 409; önceki atama varsa
  kanalı silip değiştirir), `unassignTeamFromClosure`, `removeRecurringClosure` artık atama varsa
  kanalı **açıkça** siler (`channelRemoved` yayını için — salt FK CASCADE'e bırakılmaz) + üyeleri
  bilgilendirir. `createRecurringClosure` opsiyonel `teamShortId/opponentTeamShortId` alır (tek adımda
  oluştur+ata; eski client'lar göndermez). ChatService düz enjeksiyon (ReservationSupportService emsali).
  Türkçe gün adları sunucuda tek `DAY_LABELS` map'i (kanal adı: `"{İşletme} — Her {Gün} {saat}"`).
- `chat.service`: `createSubscriptionChannel`, `deleteSubscriptionChannelByClosure`; `deleteChannel`
  SUBSCRIPTION'ı **açıkça reddeder** (null-status açığı: statusType null'da soft-delete serbestti);
  `getUserChannels` §26 uyumlu **tek** ek sorgu (`recurring_closures ⋈ pitches ⋈ businesses`) + takım
  id'leri mevcut takım batch'ine eklenir → `avatarData.subscription = { dayOfWeek, startTime, endTime,
  pitchName, businessName, homeTeamId, awayTeamId }`, `reservation: null` kalır;
  `addUserToTeamActiveMatchChannels` / `removeUserFromTeamActiveMatchChannels` abone kanallarını da
  senkronlar (`subscriptionChannelIdsForTeam` helper'ı).
- `notifications.service`: `buildChatTitle` + `sendChatPushToParticipants` union'ına `SUBSCRIPTION`;
  `createSubscriptionNotification(memberIds, title, message)` (type `SYSTEM` — eski client güvenli).
  Kanal içi kuruluş sistem mesajı `skipPush=true` (çift push kuralı §13/§17).
- **İkizler güncellendi (§38/§45):** `purgeTeam` + `purgeTeamRaw` — takım silinmeden önce
  `chat_channels WHERE relatedClosureId IN (SELECT ... teamId=$1 OR opponentTeamId=$1)` DELETE +
  `recurring_closures` atama kolonları NULL. Takım silinirse atama tümüyle düşer (tek taraflı rakipli
  chat anlamsız); `deleteTeam` abonelik yüzünden ENGELLENMEZ.
- **§60 entegrasyonu (kullanıcı kararı):** atanmış sabit kapatma = ileri tarihli kesin maç.
  `pitch-downgrade.validateDowngrade` saha başına `recurring_closures(isActive, teamId NOT NULL)`
  kontrolü → 409 `conflicts` `{type:'SUBSCRIPTION', dayOfWeek, startTime, teamName}`. Silme cron'unda
  savunmacı temizlik (kanal DELETE + kolon NULL + warn log).
- Endpoint'ler (JwtAuthGuard + `assertPitchOwnedBy`): `PATCH /reservations/recurring-closures/:id/team`,
  `DELETE /reservations/recurring-closures/:id/team`, `POST /reservations/recurring-closures` gövde
  genişletmesi, `GET /reservations/recurring-closures/pitch/:pitchId` artık `team/opponentTeam`
  ilişkileriyle döner.

**Client:**
- İşletme: `BusinessDashboard/components/AssignSubscriberModal.tsx` (Tek Takım / Rakipli toggle,
  kod input + `GET /teams/search/{kod}` debounce'lu birebir önizleme, mevcut atamada kaldır/değiştir).
  `SlotDetailModal` SÜREKLİ DOLU kartı: atanmış takım çipleri + "Abone Takım Ata / Aboneyi Yönet"
  butonu (`closureAssignments` — slot açılınca sahanın kural listesi lazily çekilir). "Sürekli kapat"
  başarısı sonrası opsiyonel "Takım Ata" promptu (ConfirmModal). `RecurringClosuresSection` salt-okunur
  takım çipleri.
- Müşteri chat: `ChannelItem` + `Chat.tsx` SUBSCRIPTION dalları — yeşil ABONE pili, rakipli VS avatar /
  tek logo, "Sabit Rezervasyon Aboneliği" etiketi; rakipli modda `teamChatColors` forma çipleri
  `avatarData.subscription.homeTeamId/awayTeamId`'den; başlığa dokununca `avatarData`'dan beslenen
  basit bilgi modalı (endpoint yok). `useChat` artık `channelRemoved` dinler (açık kanal silinirse
  listeye döner). `types.ts` union'a `JOKER_NEGOTIATION` + `SUBSCRIPTION` eklendi.

**Eski client uyumu:** bilinmeyen `SUBSCRIPTION` tipi DM fallback'iyle zararsız render olur (genel
avatar + kanal adı, durum rozeti yok, silme butonu görünmez; sunucu silmeyi zaten reddediyor).
Sunucuda tip filtrelemesi YAPILMAZ. Deploy sırası: **server → client (mobil)**.

**Doğrulama:** server `npm run build` ✓ + değişen dosyalarda eslint ✓; client `vite build` ✓
(`tsc --noEmit` tek hata: önceden var olan LocationStep `window.google`, ilgisiz). Cihaz testi +
canlı deploy bekliyor.

### §86. Abonelik profesyonelleştirme: admin sınıflandırma + ödeme penceresi + intro-offer açığı (2026-07-19)

**Dört parça (kullanıcı onaylı kapsam):**

**1) Admin "Abonelikler" sayfası.** RevenueCat davetli (promo) işletmeleri HİÇ görmez —
tek gerçek kaynak kendi DB'miz. Yeni `GET /admin/subscriptions` (admin-subscription.service
`listSubscriptions`): subscriptions → owner (`o.id::text = s.ownerId` cast, promo-codes
emsali) → business + promo kodu; sayfalı + statü filtresi + arama. `/admin/statistics`
genişletildi: 5 statünün tamamı + `graceSubscriptions` + `noSubscription`; **MRR artık
yalnız status='active'** (§7 "MRR trial sayıyor" borcu kapandı); byPlan eski anlamıyla
görünür-3 statüden. `/admin/applications` yanıtına EKLEMELİ `subscription` özeti
(status/planType/graceUntil) → ApplicationsList satır rozeti. client-admin: yeni
`SubscriptionsPage` (sayı kartları + filtre çipleri + rozetli liste, PromoCodesPage/
Dashboard desenleri), Sidebar "Abonelikler" (IconSubscription), Dashboard'a abonelik
kart satırı (stats.revenue İLK KEZ render edildi).

**2) Ödeme penceresi (grace) — davetli bitişinde sert kesme kaldırıldı.** Tasarım kararı:
YENİ ENUM DEĞERİ YOK (subscriptions_status_enum native PG enum, canlı ALTER riski) —
grace boyunca status `complimentary` KALIR + yeni nullable `graceUntil` timestamp
(synchronize güvenli ekledi). Böylece 8 sunucu görünürlük noktası
(CUSTOMER_VISIBLE_SUBSCRIPTION_STATUSES kullanıcıları) + 3 client gate dizisi SIFIR
değişiklikle işlevsel kaldı. Cron `processComplimentaryExpiry` 3 faz: (1a)
`complimentaryUntil<=now && graceUntil IS NULL` → graceUntil=+7g, stage=4,
SUBSCRIPTION_REMINDER "Ödeme Pencereniz Başladı"; (1b) bitişe ≤3g, stage=5 "Son Uyarı";
(1c) `graceUntil<=now` → EXPIRED + SUBSCRIPTION_EXPIRED (graceUntil audit kalır).
Bildirim tipleri değişmedi → client yönlendirmeleri (BusinessNotificationsPage:90,
pushNotificationService:135) dokunulmadı. `confirmPurchase` temizliğine `graceUntil=null`
eklendi. Client: ComplimentaryExpiryBanner'a acil grace varyantı (kullanıcı onaylı metin),
BusinessDashboard'a engellemeyen amber grace bandı, SubscriptionCard'a "Ödeme penceresi"
satırı. Grace'te yeni promo kodu reddi SÜRÜYOR (kod zincirleme önlemi). Trial'a grace YOK.

**3) Yanıltıcı metin.** Süresi dolmuş paywall'daki "90 gün ücretsiz deneme" vaatleri
kaldırıldı (BusinessDashboard + NoSubscriptionCTA → "Planını seç, işletmeni yeniden
yayına al") — süresi dolan yeniden deneme ALMIYOR (confirmPurchase → doğrudan ACTIVE).
Kayıt akışı metinleri (WelcomeStep/PitchesAndPlanStep/PaymentStep) DOKUNULMADI.

**4) Mağaza intro-offer açığı (KANITLANDI + kod hazırlığı).** "İlk 3 ay ücretsiz"
MAĞAZA ürününde tanımlı intro offer (kayıtta gerçek purchasePackage; server TRIAL satırı
kozmetik ayna, ilk webhook ACTIVE'e ezer; webhook period_type OKUMUYOR; hiçbir eligibility
kodu yok). Promo'su biten işletme mağazaya İLK KEZ abone → Apple/Google intro'yu YİNE
verir; repo tek başına engelleyemez. Hazırlık: `purchasePlan(planType, {preferOffering})`
— `no_trial` RC offering'i varsa ondan satın alır, yoksa SESSİZCE current'a düşer
(kurulum öncesi hiçbir akış kırılmaz). `needsNoTrial = promoCodeId!=null (expired'da audit
kalır) || status==='complimentary'` → handleSelectPlan + handleDowngradeConfirm.
KULLANICININ YAPMASI GEREKEN (panel işi): ASC + Play Console'da intro'suz eş ürünler,
RC'de aynı 5 paket kimliğiyle `no_trial` offering'i. Gelecek işi: webhook period_type
yakalama (intro-aktif vs ödeyen-aktif analitiği).

**Deploy sırası:** server → client-admin (FE+BE birlikte; /admin/applications alanı
eklemeli, eski FE yok sayar) → client (yeni native sürüm). Canlı DB'de elle SQL YOK
(graceUntil'i synchronize ekler; notifications.type varchar — canlıda salt-okunur
doğrulandı). Doğrulama: 3 paket build + server boot temiz; cihaz/cron senaryoları bekliyor.

### §87. Abone takım deneyiminin zenginleştirilmesi (detay + not + Sahalar) (2026-07-21)

> **İhtiyaç:** §85 abone takım atamasını ve SUBSCRIPTION kanalını getirdi ama deneyim üç noktada
> yarımdı: işletme atadığı takımı tanımıyordu (yalnız logo+isim çipi), abone sohbetine not
> gönderemiyordu (not akışı rezervasyona bağlıydı, abonelikte rezervasyon yok), müşteri tarafındaki
> detay modalı endpoint'siz gün/saat kutusuydu ve Sahalar'da abone saati "İşletme Tarafından
> Kapalı" görünüyordu.

**Kullanıcı kararları:** Sahalar ızgarasında etiket `SABİT` → `ABONE` (küçük hücreye logo
konmaz, logo detay modalında); not butonu SÜREKLİ DOLU kartında ayrı buton; müşteri detay
modalında kaptan telefonu **maç modalıyla aynı** (yeni gizlilik kararı doğurmasın); not
`BUSINESS_NOTE` gibi push da gönderir.

**Sunucu (4 değişiklik, hepsi EKLEMELİ):**
- `reservation-recurring.findRecurringClosuresByPitch`: relations'a `team.captain` +
  `opponentTeam.captain`; atanmış takım id'leri toplanıp **kural sayısından bağımsız sabit 2
  grouped sorgu** ile `playedMatchCount` + `playerCount` doldurulur (`countPlayedMatchesByTeam` /
  `countPlayersByTeam` — RatingsService'in ikizi; `ReservationsModule` `RatingsModule`'ü import
  ETMİYOR, yeni modül bağı yerine mevcut repo kullanıldı). İşletme artık abone takımı rezervasyon
  isteğindeki kadar tanıyor. Ek endpoint YOK (`closureAssignments` zaten bu ucu çekiyor).
- `reservation-recurring.sendSubscriptionNote(closureId, ownerId, note)` +
  `POST /reservations/recurring-closures/:id/note`: `assertNoteWithinLimit(note, 100)` →
  `assertPitchOwnedBy` → `chatService.findSubscriptionChannelByClosure` (yeni okuma helper'ı) →
  `sendMessage(channel, null, "{{COMMENT}} {İşletme} Mesajı:\n{not}", isSystem, metadata, skipPush)`
  → `createSubscriptionNotification` push'u atar (§13/§17 çift push kuralı). **İşletme sahibi
  SUBSCRIPTION kanalının katılımcısı DEĞİL** → not gerçek mesaj değil `senderId: null` sistem
  mesajıdır (sendBusinessNote emsali). Yeni metadata varyantı `{ type:'SUBSCRIPTION_NOTE',
  closureId }` — mevcut `BUSINESS_NOTE` varyantı zorunlu `reservationId` istiyor, abonelikte yok.
  Client sistem mesajlarını metadata'dan DEĞİL içerik işaretçilerinden render ettiği için eski
  client'ta zararsız. Atamasız kural → 400, kanal yoksa → 404.
- `chat.getSubscriptionDetails(channelId, userId)` + `GET /chat/channels/:id/subscription-details`:
  `getChannelMatchDetails`'in abonelik ikizi. Takım blokları **birebir `ChannelMatchTeamData`**
  döner (client maç modalının bölümlerini yeniden kullanabilsin). Tek raw sorgu ile kural + saha +
  işletme (+ `business_owner.phone`); `mode: 'single' | 'rival'`; `nextOccurrence` = kurala bağlı
  ilk gelecek blok. **Katılımcı kontrolü var** (`ForbiddenException`) — mevcut `match-details`
  ucunda bu kontrol YOK, yeni uçta baştan doğru yapıldı.
- `reservation-query.findByPitchAndDateRange` → `attachSubscriberTeams`: `recurringClosureId` dolu
  satırlara `subscriberTeam` / `subscriberOpponentTeam` iliştirilir (gün başına 1 ek sorgu).
  **`reservation.team`'e ASLA yazılmaz** — eski client `team` dolu görürse bunu normal dolu maç
  sanar ve "İşletme Tarafından Kapalı" ekranını kaybederdi (§85 eski-client uyumu). Bu uç giriş
  yapmış herkese açık olduğu için kaptan/telefon VERİLMEZ; yalnız id+isim+logo+renkler.

**Client — işletme:**
- `BusinessDashboard/SlotDetailModal`: rezervasyon isteği takım künyesi yerel **`TeamInfoCard`**
  bileşenine çıkarıldı (logo + isim + kaptan ad/telefon + `telHref` "Kaptanı Ara" + fair play +
  maç sayısı) ve SÜREKLİ DOLU kartındaki abone çipleri bu künyeyle değiştirildi (`label` prop'u:
  "Abone Takım" / "Abone Takım (Kendi Aramızda)" / "Rakip Abone Takım"). ~110 satır JSX tekrarı
  düştü. Buton sırası: Abone Takım Ata/Yönet → **Not Gönder** (yalnız atama varsa) → Sadece Bu
  Haftayı Boşa Çıkar → Sürekli Kapatmayı Kaldır.
- Yeni `SubscriptionNoteModal` — **`KeyboardAwareModal`** ile (portalToBody, sabit header/footer):
  klavye açılınca panel klavyenin üstüne hizalanır, gövde `overflow-y-auto` olduğu için global
  `useKeyboardScroll` textarea'yı ortalar → **input klavyenin arkasında kalmaz** (kullanıcının açık
  şartı). İçerik `DashboardActionModals`'ın SEND_NOTE dalıyla aynı: preset seçici +
  `CharCountTextarea` + `NOTE_CHAR_LIMITS.business` + "Bu notu kaydet"/"Notları Yönet".
  `useBusinessDashboard`: `subscriptionNoteModal` state + `openSubscriptionNote` (preset'leri
  `presetNotesLoadedRef` deseniyle lazily yükler) + `handleSendSubscriptionNote`.

**Client — müşteri:**
- Yeni `Chat/components/SubscriptionDetailModal`: `MatchDetailModal`'ın abonelik ikizi (bottom
  sheet, portal, z-[80], yeşil üst şerit). Rakipli → iki takım + VS + Takım Karşılaştırması +
  iki kaptan kartı; tek takım → tek rozet + 3'lü istatistik + tek kaptan kartı. Tür rozeti
  "Rakipli Abonelik" / "Kendi Aramızda (Tek Takım)". Abonelik Bilgileri: her {Gün}, saat aralığı,
  sıradaki maç, saha+işletme+tip, mesafe (`useLocationContext`+`calculateDistance`), ilçe+adres,
  ücret. **Sahayı Ara + Yol Tarifi** (`DirectionsConfirmModal` yeniden kullanıldı).
  Sunucu detayı gelmezse `avatarData.subscription` **yedeği** ile render olur (eski sunucu/ağ
  hatasında boş ekran yok). `Chat.tsx`'teki gömülü basit modal kaldırıldı; `handleHeaderTap`
  artık düz `handleOpenMatchDetail` — ayrım `useChat` içinde (SUBSCRIPTION dalı `relatedMatchId`
  şartını atlar).
- `PitchSchedule`: `subscriberTeam` varsa ızgara etiketi `SABİT` yerine **`ABONE`** (hücre yapısı
  değişmez). `PitchBooking/SlotDetailModal`: abone atanmışsa kart emerald'a döner, başlık "ABONE
  TAKIM", dolu saatlerdeki takım gösteriminin AYNISI (tek logo / iki logo + VS) + iki rozet:
  "Abone Takım (Kendi Aramızda)" ve "Sabit Rezervasyon". Abone yoksa eski ekran birebir kalır.

**Doğrulama:** server `npm run build` + eslint ✓; client `tsc --noEmit` (tek bilinen LocationStep
`window.google` hatası, ilgisiz) + `vite build` ✓. **Yerel DB'de kurulan test grafiğiyle 40 uç
testi (40/40 geçti):** atama → zenginleşmiş kural listesi (kaptan/telefon/fairplay/maç/kadro),
yabancı kullanıcı 403, müsaitlik ucunda `subscriberTeam` dolu + `team` hâlâ null + telefon
sızmıyor, abone detayı single/rival, katılımcı olmayan 403, not sohbete `SUBSCRIPTION_NOTE`
metadata'sıyla düşüyor, 101 karakter 400, atamasız kurala not 400, atama kaldırılınca alanlar
kayboluyor. **Canlı DB'de yalnız salt-okunur SELECT** çalıştırıldı (şema+SQL doğrulaması).

**Deploy sırası:** server → client (yeni native sürüm). Canlı DB'de elle SQL YOK — yeni
kolon/enum eklenmiyor. Gerçek cihaz testi (klavye davranışı, tel:/harita açılışı) bekliyor.
