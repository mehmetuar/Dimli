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

**E — İşletme silme eksikleri:**
- Sahip arşivlenmiyor (E/§7), silme nedeni loglanmıyor, admin restore/silme yok, manuel cascade kırılgan.

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
