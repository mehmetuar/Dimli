/**
 * Apify Google Maps halı saha verisini LOCAL test DB'ye tohumlar.
 *
 * ⚠️ SADECE LOCAL: bağlantı SABİT localhost/dimli — DATABASE_URL kasten OKUNMAZ,
 * yanlışlıkla canlı (Render) DB'ye çalıştırılamaz.
 *
 * Ne yapar:
 * 1. Apify JSON'unu okur (default: client/scripts/data/dataset_crawler-google-places_*.json).
 * 2. TEMİZLİK: halı saha olmayanları eler (forma imalatçısı, halı mağazası, kafe, otopark...)
 *    - HARD blacklist kategori → isim uysa bile ele ("Halı Saha Oto Yıkama" vakası)
 *    - isim `hal[ıi]\s*saha` regex'i VEYA whitelist kategori → tut
 *    - normalize isim + <200m koordinat dedup; permanentlyClosed ele
 * 3. Her işletme için müşteri görünürlük kapılarını geçen TAM YIĞIN üretir:
 *    businesses(active) + business_owner + subscriptions(trial 90g, 2_pitch)
 *    + 2× pitches(approved) + saha başına time_slots (10:00→02:00 saatlik, 16 slot).
 * 4. İDEMPOTENT: owner email'i placeId'den deterministik → aynı yer ikinci kez eklenmez.
 *
 * Kullanım (server/ içinden):
 *   npx ts-node -r tsconfig-paths/register scripts/seed-businesses-from-apify.ts [json-path]
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ── SABİT LOCAL BAĞLANTI (bilinçli: env okunmaz) ────────────────────────────
const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgrespassword',
    database: 'dimli',
    synchronize: false,
});

const DEFAULT_JSON = path.resolve(
    __dirname,
    '../../client/scripts/data/dataset_crawler-google-places_2026-07-05_20-58-42-655.json',
);

// ── Temizlik kuralları ──────────────────────────────────────────────────────
const HARD_BLACKLIST = new Set([
    'Otomotiv',
    'Halı Mağazası',
    'Spor Giyim Mağazası',
    'Spor mağazası',
    'Futbol Ürünleri Mağazası',
    'Ayakkabı mağazası',
    'Ayakkabı Toptancısı',
    'Spor Aksesuarları Toptancısı',
    'Kafe',
    'Otopark',
    'Kurumsal Ofis',
    'Vakıf',
    'Eğitim Merkezi',
    'Buz Pateni Pisti',
    'Basketbol Sahası',
    'Atletizm Pisti',
]);
const WHITELIST_CATS = new Set([
    'Futbol Sahası',
    'Futbol sahası',
    'Spor kompleksi',
    'Spor Tesisi',
    'Stadyum',
    'Spor Aktiviteleri Parkı',
]);
const NAME_RE = /hal[ıi]\s*saha|hal[ıi]saha/i;

const OPEN_TIME = '10:00';
const CLOSE_TIME = '02:00';
// 10:00 → 02:00 saatlik slotlar (gece yarısını aşar: ...23-00, 00-01, 01-02)
const SLOT_HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1];
const PITCH_PRICE = 1200;
const PLAN = { planType: '2_pitch', pitchCount: 2, pricePerMonth: 2999.99 };

interface Place {
    title?: string;
    categoryName?: string | null;
    address?: string;
    city?: string | null; // Türkiye'de Google bunu İLÇE olarak verir
    location?: { lat: number; lng: number } | null;
    phone?: string | null;
    imageUrls?: string[] | null;
    placeId?: string;
    permanentlyClosed?: boolean;
}

const hh = (n: number) => String(n).padStart(2, '0') + ':00';
const norm = (s: string) =>
    s.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();

function distMeters(a: Place, b: Place): number {
    if (!a.location || !b.location) return Infinity;
    const R = 6371000;
    const dLat = ((b.location.lat - a.location.lat) * Math.PI) / 180;
    const dLng = ((b.location.lng - a.location.lng) * Math.PI) / 180;
    const la1 = (a.location.lat * Math.PI) / 180;
    const la2 = (b.location.lat * Math.PI) / 180;
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

function cleanPlaces(raw: Place[]): { keep: Place[]; dropped: string[] } {
    const dropped: string[] = [];
    const candidates: Place[] = [];
    for (const p of raw) {
        const title = p.title ?? '';
        const cat = p.categoryName ?? '';
        if (!title || !p.location || !p.placeId) {
            dropped.push(`${title || '(isimsiz)'} — eksik alan`);
            continue;
        }
        if (p.permanentlyClosed) {
            dropped.push(`${title} — kalıcı kapalı`);
            continue;
        }
        if (HARD_BLACKLIST.has(cat)) {
            dropped.push(`${title} — blacklist kategori (${cat})`);
            continue;
        }
        if (NAME_RE.test(title) || WHITELIST_CATS.has(cat)) {
            candidates.push(p);
        } else {
            dropped.push(`${title} — halı saha değil (${cat || 'kategorisiz'})`);
        }
    }
    // Dedup: normalize isim aynı VE mesafe < 200m → zengin olan (fazla resimli) kalır
    const keep: Place[] = [];
    for (const p of candidates) {
        const dupIdx = keep.findIndex(
            (k) => norm(k.title!) === norm(p.title!) && distMeters(k, p) < 200,
        );
        if (dupIdx === -1) {
            keep.push(p);
        } else if (
            (p.imageUrls?.length ?? 0) > (keep[dupIdx].imageUrls?.length ?? 0)
        ) {
            dropped.push(`${keep[dupIdx].title} — mükerrer (az resimli kopya)`);
            keep[dupIdx] = p;
        } else {
            dropped.push(`${p.title} — mükerrer`);
        }
    }
    return { keep, dropped };
}

// Adres "..., 34662 Üsküdar/İstanbul, Türkiye" → ilçe fallback'i
function districtFromAddress(address?: string): string | null {
    const m = address?.match(/\d{5}\s+([^/]+)\/İstanbul/);
    return m ? m[1].trim() : null;
}

// placeId'den deterministik benzersiz sahte telefon (+9055 + 7 hane)
function phoneFromPlaceId(placeId: string): string {
    const digits = parseInt(
        crypto.createHash('md5').update(placeId).digest('hex').slice(0, 8),
        16,
    ) % 10_000_000;
    return '+9055' + String(digits).padStart(7, '0');
}

async function run() {
    const jsonPath = process.argv[2] ?? DEFAULT_JSON;
    const raw: Place[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`Kaynak: ${jsonPath}\nHam kayıt: ${raw.length}`);

    const { keep, dropped } = cleanPlaces(raw);
    console.log(`Temizlik: ${keep.length} tutuldu, ${dropped.length} elendi.`);
    for (const d of dropped) console.log(`  ✗ ${d}`);
    console.log('\nTutulanlar:');
    for (const k of keep)
        console.log(`  ✓ ${k.title} (${k.categoryName ?? '-'}) [${k.city ?? '-'}]`);

    await dataSource.initialize();
    const passwordHash = await bcrypt.hash('Dimli123!', 10);
    let created = 0,
        skipped = 0,
        failed = 0;

    try {
        for (const p of keep) {
            const email = `seed.${p.placeId!.toLowerCase().replace(/[^a-z0-9]/g, '')}@dimli.test`;
            const exists = await dataSource.query(
                `SELECT id FROM business_owner WHERE email = $1`,
                [email],
            );
            if (exists.length) {
                skipped++;
                continue;
            }
            try {
                await dataSource.transaction(async (em) => {
                    const district =
                        p.city?.trim() || districtFromAddress(p.address) || null;
                    const img = (i: number) => p.imageUrls?.[i] ?? p.imageUrls?.[0] ?? null;

                    const [biz] = await em.query(
                        `INSERT INTO businesses
                           (name, city, district, address, latitude, longitude, phone,
                            "coverImageUrl", "openTime", "closeTime", status)
                         VALUES ($1,'İstanbul',$2,$3,$4,$5,$6,$7,$8,$9,'active')
                         RETURNING id`,
                        [
                            p.title, district, p.address ?? null,
                            p.location!.lat, p.location!.lng, p.phone ?? null,
                            img(0), OPEN_TIME, CLOSE_TIME,
                        ],
                    );

                    const [owner] = await em.query(
                        `INSERT INTO business_owner
                           (email, password, "fullName", phone, "phoneVerified", "businessId")
                         VALUES ($1,$2,$3,$4,true,$5)
                         RETURNING id`,
                        [email, passwordHash, `${p.title} Sahibi`, phoneFromPlaceId(p.placeId!), biz.id],
                    );

                    await em.query(
                        `INSERT INTO subscriptions
                           ("ownerId", "planType", "pitchCount", "pricePerMonth", status, "trialEndsAt")
                         VALUES ($1,$2,$3,$4,'trial', NOW() + interval '90 days')`,
                        [owner.id, PLAN.planType, PLAN.pitchCount, PLAN.pricePerMonth],
                    );

                    for (let i = 0; i < 2; i++) {
                        const [pitch] = await em.query(
                            `INSERT INTO pitches
                               (name, business_id, type, "pricePerHour", "imageUrl",
                                "openTime", "closeTime", "approvalStatus", "isActive")
                             VALUES ($1,$2,'OUTDOOR',$3,$4,$5,$6,'approved',true)
                             RETURNING id`,
                            [`${i + 1} No'lu Saha`, biz.id, PITCH_PRICE, img(i), OPEN_TIME, CLOSE_TIME],
                        );
                        for (const h of SLOT_HOURS) {
                            await em.query(
                                `INSERT INTO time_slots ("pitchId", "startTime", "endTime", "isActive")
                                 VALUES ($1,$2,$3,true)`,
                                [pitch.id, hh(h), hh((h + 1) % 24)],
                            );
                        }
                    }
                });
                created++;
            } catch (err: any) {
                failed++;
                console.error(`  !! ${p.title}: ${err.message}`);
            }
        }

        console.log(
            `\n✅ Bitti — eklenen: ${created}, atlanan (zaten var): ${skipped}, hata: ${failed}`,
        );
        const [c] = await dataSource.query(
            `SELECT
               (SELECT count(*)::int FROM businesses)      AS businesses,
               (SELECT count(*)::int FROM business_owner)  AS owners,
               (SELECT count(*)::int FROM subscriptions)   AS subs,
               (SELECT count(*)::int FROM pitches)         AS pitches,
               (SELECT count(*)::int FROM time_slots)      AS slots`,
        );
        console.log(
            `DB durumu: işletme=${c.businesses} sahip=${c.owners} abonelik=${c.subs} saha=${c.pitches} slot=${c.slots}`,
        );
    } finally {
        await dataSource.destroy();
    }
}

run().catch((err) => {
    console.error('Hata:', err.message);
    process.exit(1);
});
