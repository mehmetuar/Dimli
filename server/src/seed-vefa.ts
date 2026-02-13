import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';

async function seedVefa() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    try {
        console.log('✅ Connected to database');

        // 1. Find and update Vefa Spor Tesisleri
        const [business] = await dataSource.query(
            `SELECT * FROM businesses WHERE name LIKE '%Vefa%' LIMIT 1`
        );

        if (!business) {
            console.log('❌ Vefa Spor Tesisleri not found');
            await app.close();
            return;
        }

        console.log('🏢 Found:', business.name, business.id);

        // 2. Update business hours
        await dataSource.query(
            `UPDATE businesses SET "openTime" = $1, "closeTime" = $2 WHERE id = $3`,
            ['09:00', '23:00', business.id]
        );
        console.log('✅ Updated hours: 09:00 - 23:00');

        // 3. Upsert 3 pitches (update if exists, insert if not)
        const pitches: [string, string, number, string[]][] = [
            ['Saha 1', 'Profesyonel kalite halı saha', 800, ['Duş', 'Soyunma Odası', 'Tribün', 'Aydınlatma', 'Otopark']],
            ['Saha 2', 'Orta boy halı saha', 650, ['Duş', 'Soyunma Odası', 'Aydınlatma', 'Otopark']],
            ['Saha 3', 'Ekonomik halı saha', 500, ['Soyunma Odası', 'Aydınlatma', 'Otopark']]
        ];

        for (const [name, desc, price, facilities] of pitches) {
            // Check if pitch exists
            const [existing] = await dataSource.query(
                `SELECT id FROM pitches WHERE name = $1 AND business_id = $2`,
                [name, business.id]
            );

            if (existing) {
                // Update existing
                await dataSource.query(
                    `UPDATE pitches SET description = $1, "pricePerHour" = $2, facilities = $3 WHERE id = $4`,
                    [desc, price, facilities.join(','), existing.id]
                );
                console.log(`✅ Updated ${name} - ${price}₺/saat`);
            } else {
                // Insert new
                await dataSource.query(
                    `INSERT INTO pitches (name, description, "pricePerHour", business_id, facilities) 
                     VALUES ($1, $2, $3, $4, $5)`,
                    [name, desc, price, business.id, facilities.join(',')]
                );
                console.log(`✅ Created ${name} - ${price}₺/saat`);
            }
        }

        console.log('\n🎉 Vefa Spor Tesisleri seeded successfully!');
        console.log('📋 Summary:');
        console.log('  - Business: Vefa Spor Tesisleri');
        console.log('  - Hours: 09:00 - 23:00');
        console.log('  - Pitches: 3 (800₺, 650₺, 500₺)');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await app.close();
    }
}

seedVefa();
