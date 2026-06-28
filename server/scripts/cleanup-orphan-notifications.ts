/**
 * Öksüz bildirim temizliği (tek seferlik / idempotent)
 *
 * Sahibi (User veya BusinessOwner) artık var olmayan notifications satırlarını siler.
 * notifications.userId polimorfiktir (User VEYA BusinessOwner id'si tutar), bu yüzden
 * her iki tabloda da KARŞILIĞI OLMAYAN satırlar gerçek öksüzdür.
 *
 * Kullanım (Render production DB'ye karşı):
 *   DATABASE_URL='postgresql://...' npx ts-node -r tsconfig-paths/register scripts/cleanup-orphan-notifications.ts
 *
 * DATABASE_URL verilmezse localhost dev DB'ye bağlanır. synchronize:false (şemaya dokunmaz).
 * Tekrar çalıştırılabilir — ikinci çalıştırmada 0 siler.
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

// NULL-güvenli: NOT EXISTS ile User ve BusinessOwner'da karşılığı olmayan satırlar.
const ORPHAN_WHERE = `
  NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id::text = n."userId")
  AND NOT EXISTS (SELECT 1 FROM business_owner bo WHERE bo.id::text = n."userId")
`;

async function run() {
    await dataSource.initialize();
    try {
        const before = await dataSource.query(
            `SELECT COUNT(*)::int AS c FROM notifications n WHERE ${ORPHAN_WHERE}`,
        );
        const count: number = before[0].c;
        console.log(`Öksüz bildirim bulundu: ${count}`);

        if (count === 0) {
            console.log('✅ Silinecek öksüz bildirim yok.');
            return;
        }

        await dataSource.query(
            `DELETE FROM notifications n WHERE ${ORPHAN_WHERE}`,
        );

        const after = await dataSource.query(
            `SELECT COUNT(*)::int AS c FROM notifications n WHERE ${ORPHAN_WHERE}`,
        );
        console.log(`✅ Silindi: ${count}. Kalan öksüz: ${after[0].c}`);
    } finally {
        await dataSource.destroy();
    }
}

run().catch((err) => {
    console.error('Hata:', err.message);
    process.exit(1);
});
