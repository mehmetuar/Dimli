# 🔐 SahaPro - Test Hesapları

**Tarih:** 13 Şubat 2026  
**Oluşturulan Hesap Sayısı:** 7 (İşletme Sahipleri)

---

## 📋 İşletme Sahipleri (Business Owners)

Tüm hesaplar için varsayılan şifre: **`test123`**

| # | İşletme Adı | Email | Şifre | Durum |
|---|-------------|-------|-------|-------|
| 1 | Vefa Spor Tesisleri | vefasportesisleri@sahapro.com | test123 | ✅ Aktif |
| 2 | Halı Saha Dünyası - Ümraniye | halisahadunyasiumraniye@sahapro.com | test123 | ✅ Aktif |
| 3 | Yeldeğirmeni Spor Kompleksi | yeldegirmenisporkompleksi@sahapro.com | test123 | ✅ Aktif |
| 4 | Beşiktaş Belediyesi Çilekli Tesisleri | besiktasbelediyesicileklitesisleri@sahapro.com | test123 | ✅ Aktif |
| 5 | Mega Halı Saha | megahalisaha@sahapro.com | test123 | ✅ Aktif |
| 6 | Kadıköy Arena | kadikoyarena@sahapro.com | test123 | ✅ Aktif |
| 7 | Beşiktaş Çim Saha | besiktascimsaha@sahapro.com | test123 | ✅ Aktif |

---

## 🧪 Test Senaryoları

### **Senaryo 1: İşletme Login**
```bash
# Vefa Spor Tesisleri ile login
curl -X POST http://localhost:3000/auth/business/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vefasportesisleri@sahapro.com","password":"test123"}' | jq
```

**Beklenen Sonuç:** 
- ✅ Token döner
- ✅ role: 'business-owner'

### **Senaryo 2: Dashboard Erişimi**
```bash
# Token ile dashboard'a erişim
curl http://localhost:3000/business-owner/dashboard?date=2026-02-13&ownerId=OWNER_ID \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

**Beklenen Sonuç:**
- ✅ Business name görünür
- ✅ Pitch listesi gelir
- ✅ Slot bilgileri gösterilir

### **Senaryo 3: Tüm İşletmelerin Owner'larını Listele**
```bash
# Repository ile fetch edilirse
curl http://localhost:3000/business-owner/list | jq
```

---

## 📱 Frontend Test (iOS / Xcode)

### **İşletme Paneline Giriş**
1. Xcode'da uygulamayı başlat
2. Business Login sayfasına git
3. Yukarıdaki email ve şifre ile giriş yap
4. Dashboard'ın düzgün yüklendiğini doğrula

### **Rezervasyon Onaylama**
1. Sahalar sayfasında (kullanıcı hesabı) bir maç eşleşmesi oluştur
2. İşletme hesabına geç
3. Dashboard'da PENDING rezervasyonu gör
4. Onayla
5. Sahalar sayfasında DOLU olarak görünmeli

---

## 🔄 Seed Script Yenileme

Yeni işletme eklendiğinde otomatik owner oluşturmak için:

```bash
# Server dizininde
npx ts-node src/seed-business-owner.ts
```

Script otomatik olarak:
- ✅ Mevcut owner'ları atlayacak
- ✅ Sadece yeni businesses için owner oluşturacak
- ✅ Email'i işletme adından türetecek (Türkçe karakter dönüşümlü)

---

## ✅ Doğrulama Checklist

- [x] 7 işletme için owner oluşturuldu
- [ ] Her işletme ile login testi yapıldı
- [ ] Dashboard'lar çalışıyor
- [ ] Rezervasyon onaylama testi
- [ ] İşletme settings sayfası erişilebilir

---

## 📝 Not

Eğer bir işletmenin owner hesabını silip yeniden oluşturmak isterseniz:

```sql
-- PostgreSQL'de
DELETE FROM business_owner WHERE email = 'isletme@sahapro.com';

-- Sonra seed script'i tekrar çalıştır
npx ts-node src/seed-business-owner.ts
```

---

**Oluşturulma Tarihi:** 13 Şubat 2026  
**Son Test:** 13 Şubat 2026
