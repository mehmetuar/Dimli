/**
 * Admin kullanıcısı oluşturma scripti
 * Kullanım: npx ts-node -r tsconfig-paths/register scripts/create-admin.ts
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
    entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
    synchronize: false,
});

async function createAdmin() {
    await dataSource.initialize();

    const email = process.argv[2] || 'admin@dimli.com';
    const password = process.argv[3] || 'Admin123!';
    const role = process.argv[4] || 'superadmin';

    const hashedPassword = await bcrypt.hash(password, 10);

    await dataSource.query(
        `INSERT INTO admin_users (email, password, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET password = $2, role = $3`,
        [email, hashedPassword, role]
    );

    console.log(`✅ Admin oluşturuldu: ${email} (rol: ${role})`);
    await dataSource.destroy();
}

createAdmin().catch(err => {
    console.error('Hata:', err.message);
    process.exit(1);
});
