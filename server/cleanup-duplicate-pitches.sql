-- Kadıköy Arena için eski "Merkez Saha" pitch'ini silme
-- Bu pitch eski seed'den kalmış ve tutarsızlık yaratıyor

-- İlk olarak bu pitch ile ilişkili reservations ve match announcements'ları kontrol et
SELECT id, name, business_id FROM pitch WHERE name = 'Merkez Saha';

-- Eğer ilişkili kayıtlar yoksa sil
-- DELETE FROM pitch WHERE name = 'Merkez Saha' AND business_id IN (SELECT id FROM business WHERE name = 'Kadıköy Arena');
