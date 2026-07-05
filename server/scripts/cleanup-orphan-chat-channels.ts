/**
 * Öksüz sohbet kanalı temizliği (tek seferlik / idempotent)
 *
 * Maç ilanı (match_announcements) artık var olmayan MATCH_GROUP / JOKER_NEGOTIATION
 * kanallarını siler. Bu kanallar takım silme akışı (purgeTeam/purgeTeamRaw) veya ilan
 * silme öncesi chat temizliği EKLENMEDEN ÖNCE oluşmuş "ölü" sohbetlerdir; Operasyon
 * Merkezi'nde "durumsuz maç" olarak takılı kalır ve silinemezler.
 *
 * chat_channels → chat_participants_v2 / chat_messages FK'ları ON DELETE CASCADE
 * olduğundan tek DELETE, katılımcı + mesajları da temizler.
 *
 * ⚠️ CANLI PRODUCTION verisine yazar — çalıştırmadan önce açık onay gerekir.
 * Kod tarafı düzeltmesi (purgeTeam/purgeTeamRaw/deleteAccount/ilan-silme) DEPLOY
 * edildikten SONRA çalıştırılmalı (aradaki bir takım silme yeni öksüz üretmesin).
 * Tekrar çalıştırılabilir — ikinci çalıştırmada 0 siler.
 *
 * Kullanım (Render production DB'ye karşı):
 *   DATABASE_URL='postgresql://...' npx ts-node -r tsconfig-paths/register scripts/cleanup-orphan-chat-channels.ts
 *
 * DATABASE_URL verilmezse localhost dev DB'ye bağlanır. synchronize:false (şemaya dokunmaz).
 */

import { DataSource } from 'typeorm';

const dataSource = new DataSource(
    process.env.DATABASE_URL
        ? {
              type: 'postgres',
              url: process.env.DATABASE_URL,
              ssl: { rejectUnauthorized: false },
              synchronize: false,
          }
        : {
              type: 'postgres',
              host: 'localhost',
              port: 5432,
              username: 'postgres',
              password: 'postgrespassword',
              database: 'dimli',
              synchronize: false,
          },
);

// Öksüz = ilgili maç ilanı artık yok. relatedMatchId varchar, match_announcements.id
// uuid → id::text cast şart. IS NOT NULL guard'ı, relatedMatchId'siz kanalları korur.
const ORPHAN_WHERE = `
  c.type IN ('MATCH_GROUP','JOKER_NEGOTIATION')
  AND c."relatedMatchId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "match_announcements" ma WHERE ma.id::text = c."relatedMatchId"
  )
`;

async function run() {
    await dataSource.initialize();
    try {
        await dataSource.transaction(async (em) => {
            const rows: { id: string; type: string; name: string | null }[] =
                await em.query(
                    `SELECT c.id, c.type, c.name FROM "chat_channels" c WHERE ${ORPHAN_WHERE} ORDER BY c.type, c.name`,
                );
            console.log(`Öksüz sohbet kanalı bulundu: ${rows.length}`);
            for (const r of rows) {
                console.log(`  - [${r.type}] ${r.name ?? '(isimsiz)'} (${r.id})`);
            }

            if (rows.length === 0) {
                console.log('✅ Silinecek öksüz sohbet yok.');
                return;
            }

            await em.query(`DELETE FROM "chat_channels" c WHERE ${ORPHAN_WHERE}`);

            const after: { c: number }[] = await em.query(
                `SELECT COUNT(*)::int AS c FROM "chat_channels" c WHERE ${ORPHAN_WHERE}`,
            );
            console.log(`✅ Silindi: ${rows.length}. Kalan öksüz: ${after[0].c}`);
        });
    } finally {
        await dataSource.destroy();
    }
}

run().catch((err) => {
    console.error('Hata:', err.message);
    process.exit(1);
});
