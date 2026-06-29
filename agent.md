# agent.md — Dimli Bilgi Tabanı (admin panel odaklı)

> Bu dosya, Dimli projesinde çalışacak bir AI ajanın hızlıca devralması için hazırlanmış
> bilgi notudur. Özellikle **admin panel (`client-admin/`)** ve onu besleyen **backend**
> üzerine derinleştirilmiştir. Kalıcı kurallar için ayrıca repo kökündeki **`CLAUDE.md`**'yi oku
> (oradaki talimatlar bağlayıcıdır). Bu dosya ise "neyin nerede olduğu + bilinen sorunlar"
> haritasıdır. Son güncelleme: 2026-06-28.

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
`admin.service.ts` (mantık). Korumalı endpoint'lerin hepsi `@UseGuards(AdminJwtAuthGuard)`;
istisna: `POST /admin/maintenance/seed-subscriptions` (**guard'sız**, §8/C3).

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
- C3. **Korumasız seed endpoint** (`/admin/maintenance/seed-subscriptions`) + kodda sabit secret
  (`'dimli-seed-2026'`). → guard ekle / sabit secret kaldır.
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

**⏳ AÇIK (henüz yapılmadı):**
- **F1 (orta):** `sendJokerInvite` çağıranın yetkisini doğrulamıyor → herhangi biri herhangi bir
  takım "adına" joker daveti gönderebilir. Fix: çağıran maçtaki **iki takımdan birinin** kaptanı/
  yardımcı kaptanı olmalı.
- **F2 (orta, gizli):** `invite-joker`'da rol "kim çağırdıysa" mantığıyla; joker'in kendisi
  çağırırsa davet edeni "joker" diye ekleyebilir (pratik zarar `existingMainParticipant` guard'ı
  yüzünden sınırlı). Fix: kaptan/yardımcı kaptan kontrolü.
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

### ⚠️ Açık kalan güvenlik borcu (follow-up)
`PATCH /businesses/:id` (`business.controller.ts`) **hâlâ guard'sız** ve `Object.assign` ile her
alanı (status dahil!) yazıyor → bir owner teoride kendini `active` yapabilir. Resubmit bu açığı
**kullanmıyor** (ayrı, güvenli, JWT-türetimli uç). Genel düzeltme: `/businesses` controller'ına
guard + sahiplik kontrolü (mevcut çağıranları — `BusinessInfoSettings` save vb. — denetleyerek).

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
