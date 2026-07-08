/**
 * LOCAL test DB'ye 200 maç ilanı (Maç Pazarı) tohumlar — 40 takım + kadro + ilanlar.
 *
 * ⚠️ SADECE LOCAL: bağlantı SABİT localhost/dimli — DATABASE_URL kasten OKUNMAZ.
 *
 * İdempotent: her çalıştırmada önce mevcut takım/ilan/seed-oyuncuları temizler
 * (testoyuncu + 52 işletme/sahip korunur), sonra 40 takım (kaptan + 4-7 oyuncu) ve
 * 200 rakip_araniyor/PENDING ilan üretir; ilanlar bugün..+13 güne, 14:00-23:00 saatlerine dağıtılır.
 *
 * Kullanım (server/ içinden):
 *   npx ts-node -r tsconfig-paths/register scripts/seed-matches-local.ts
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgrespassword',
    database: 'dimli',
    synchronize: false,
});

const TEAM_COUNT = 40;
const TOTAL_ILANS = 200;
const DAYS_SPREAD = 14; // bugün..+13
const TIMES = ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO'];
const POSITIONS = ['Kaleci', 'Defans', 'Orta Saha', 'Forvet'];
const PLAYER_COUNTS = [7, 7, 7, 7, 7, 6, 8, 5, 11]; // ağırlıklı 7
const COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#3b82f6', '#6366f1',
    '#a855f7', '#ec4899', '#14b8a6', '#84cc16', '#f43f5e', '#0891b2', '#7c3aed',
];
const DESCRIPTIONS = [
    'Rakip arıyoruz, seviyeli maç.', 'Dostluk maçı, herkes gelebilir.',
    'Ciddi takım arıyoruz.', 'Keyifli bir maç olsun.', 'Fair-play önemli.',
    null, null, null, // bazıları boş
];

const NAME_PREFIX = [
    'Fatih', 'Üsküdar', 'Kadıköy', 'Beyoğlu', 'Eyüp', 'Şişli', 'Beşiktaş', 'Bakırköy',
    'Zeytinburnu', 'Maltepe', 'Kartal', 'Pendik', 'Ataşehir', 'Sarıyer', 'Bağcılar',
    'Yıldız', 'Şimşek', 'Kartal', 'Aslan', 'Fırtına', 'Kobra', 'Panter', 'Boğa', 'Şahin',
];
const NAME_SUFFIX = ['SK', 'FC', 'Spor', 'United', 'Gücü', 'Gençlik', 'Sporcular', 'Birliği', 'Yıldızları', 'Kartalları'];

const FIRST = ['Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Hüseyin', 'Emre', 'Burak', 'Can', 'Kaan', 'Onur',
    'Serkan', 'Tolga', 'Cem', 'Barış', 'Deniz', 'Uğur', 'Furkan', 'Yusuf', 'Enes', 'Berk',
    'Kerem', 'Arda', 'Efe', 'Mert', 'Umut', 'Baran', 'Eren', 'Selim', 'Hakan', 'Volkan'];
const LAST = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın',
    'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek'];

const DISTRICTS: [string, number, number][] = [
    ['Fatih', 41.015, 28.949], ['Üsküdar', 41.022, 29.013], ['Beyoğlu', 41.036, 28.977],
    ['Kadıköy', 40.99, 29.03], ['Şişli', 41.06, 28.987], ['Eyüpsultan', 41.048, 28.933],
    ['Beşiktaş', 41.043, 29.006], ['Zeytinburnu', 40.994, 28.905],
];

// Seedlenebilir PRNG (deterministik olmasa da tekrar üretimi Math.random ile — script tek seferlik)
const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pad = (n: number, w: number) => String(n).padStart(w, '0');

async function run() {
    await dataSource.initialize();
    const pw = await bcrypt.hash('Dimli123!', 10);

    try {
        // 1. İdempotent reset (LOCAL) — testoyuncu + işletme/sahip korunur
        await dataSource.query(`TRUNCATE match_announcements, challenges, join_requests CASCADE`);
        await dataSource.query(`UPDATE "user" SET team_id = NULL`);
        await dataSource.query(`DELETE FROM team`);
        await dataSource.query(`DELETE FROM "user" WHERE username <> 'testoyuncu'`);

        // Pitch havuzu
        const pitches: { id: string }[] = await dataSource.query(`SELECT id FROM pitches`);
        if (!pitches.length) throw new Error('Saha yok — önce işletme seed edilmeli.');

        // Tarih listesi: bugün..+13
        const dates: string[] = [];
        const base = new Date();
        for (let d = 0; d < DAYS_SPREAD; d++) {
            const dt = new Date(base.getTime() + d * 86400000);
            dates.push(`${dt.getFullYear()}-${pad(dt.getMonth() + 1, 2)}-${pad(dt.getDate(), 2)}`);
        }

        const usedNames = new Set<string>();
        const teamIds: string[] = [];
        let uSeq = 0;

        // 2. 40 takım + kadro
        for (let t = 0; t < TEAM_COUNT; t++) {
            let name = `${rand(NAME_PREFIX)} ${rand(NAME_SUFFIX)}`;
            while (usedNames.has(name)) name = `${rand(NAME_PREFIX)} ${rand(NAME_SUFFIX)} ${t}`;
            usedNames.add(name);

            const [district, dlat, dlng] = rand(DISTRICTS);
            const mkUser = async (unamePrefix: string, teamId: string | null): Promise<string> => {
                uSeq++;
                const username = `${unamePrefix}${pad(uSeq, 4)}`;
                const [u] = await dataSource.query(
                    `INSERT INTO "user" (username, password, full_name, position, location, latitude, longitude, team_id, nationality)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'TR') RETURNING id`,
                    [
                        username, pw, `${rand(FIRST)} ${rand(LAST)}`, rand(POSITIONS),
                        district, dlat + (Math.random() - 0.5) * 0.03, dlng + (Math.random() - 0.5) * 0.03, teamId,
                    ],
                );
                return u.id;
            };

            // Takımı önce kaptansız oluştur (captainId user'a bağlı → user önce lazım ama user team_id'ye bağlı → önce takım)
            const [team] = await dataSource.query(
                `INSERT INTO team (name, primary_color, secondary_color, level, fair_play_score, fair_play_rating_count, short_id)
                 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
                [
                    name, rand(COLORS), rand(COLORS), rand(LEVELS),
                    Math.round((3.5 + Math.random() * 1.5) * 10) / 10, randInt(0, 40),
                    `SD${pad(t, 4)}`,
                ],
            );
            teamIds.push(team.id);

            // Kaptan + oyuncular (hepsi bu takıma bağlı)
            const captainId = await mkUser('kaptan', team.id);
            await dataSource.query(`UPDATE team SET "captainId" = $1 WHERE id = $2`, [captainId, team.id]);
            const roster = randInt(4, 7);
            for (let p = 0; p < roster; p++) await mkUser('oyuncu', team.id);
        }

        // 3. 200 ilan (rakip_araniyor, PENDING) — takımlara ~eşit dağıt
        let created = 0;
        for (let i = 0; i < TOTAL_ILANS; i++) {
            const teamId = teamIds[i % teamIds.length];
            await dataSource.query(
                `INSERT INTO match_announcements (team_id, pitch_id, date, time, player_count, description, status, match_type)
                 VALUES ($1,$2,$3,$4,$5,$6,'PENDING','rakip_araniyor')`,
                [teamId, rand(pitches).id, rand(dates), rand(TIMES), rand(PLAYER_COUNTS), rand(DESCRIPTIONS)],
            );
            created++;
        }

        const [c] = await dataSource.query(
            `SELECT (SELECT count(*)::int FROM team) AS teams,
                    (SELECT count(*)::int FROM "user" WHERE username<>'testoyuncu') AS players,
                    (SELECT count(*)::int FROM match_announcements) AS ilans`,
        );
        console.log(`✅ Bitti — takım: ${c.teams}, oyuncu: ${c.players}, ilan: ${c.ilans} (eklenen ${created})`);

        // Tarih dağılımı özeti
        const dist = await dataSource.query(
            `SELECT date, count(*)::int AS n FROM match_announcements GROUP BY date ORDER BY date`,
        );
        console.log('Tarihe göre ilan dağılımı:');
        for (const r of dist) console.log(`  ${r.date}: ${r.n}`);
    } finally {
        await dataSource.destroy();
    }
}

run().catch((err) => {
    console.error('Hata:', err.message);
    process.exit(1);
});
