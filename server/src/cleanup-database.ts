import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';

/**
 * CLEANUP SCRIPT: Remove all dummy/seed data
 * 
 * This script will DELETE:
 * - All DIRECT type reservations (from seed-reservations.ts)
 * - Old seed teams (optional - keep if real users created them)
 * - Duplicate "Saha 1, 2, 3" pitches from seed-vefa.ts
 * 
 * This script will KEEP:
 * - Real businesses (Vefa Spor Tesisleri, etc.)
 * - "1 Nolu Halı Saha", "2 Nolu Halı Saha" pitches
 * - User-created teams
 * - MATCH type reservations (from auto-reservation)
 * - Real match announcements
 * - Real challenges
 */

async function cleanDatabase() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    try {
        console.log('🧹 Starting database cleanup...\n');

        // 1. DELETE all DIRECT reservations (dummy data from seed)
        const directReservations = await dataSource.query(
            `SELECT COUNT(*) as count FROM reservation WHERE type = 'DIRECT'`
        );
        console.log(`📍 Found ${directReservations[0].count} DIRECT reservations (dummy data)`);

        if (directReservations[0].count > 0) {
            await dataSource.query(`DELETE FROM reservation WHERE type = 'DIRECT'`);
            console.log('✅ Deleted all DIRECT reservations\n');
        }

        // 2. DELETE duplicate "Saha 1, 2, 3" pitches (from seed-vefa.ts)
        // Keep only "1 Nolu Halı Saha", "2 Nolu Halı Saha"
        const vefaId = '137ba49e-52f5-45a4-b128-870d7a989e08'; // Vefa business ID

        const duplicatePitches = await dataSource.query(
            `SELECT id, name FROM pitches 
             WHERE business_id = $1 
             AND name IN ('Saha 1', 'Saha 2', 'Saha 3')`,
            [vefaId]
        );

        if (duplicatePitches.length > 0) {
            console.log(`📍 Found ${duplicatePitches.length} duplicate pitches:`);
            duplicatePitches.forEach((p: any) => console.log(`  - ${p.name} (${p.id})`));

            for (const pitch of duplicatePitches) {
                // First delete any reservations for this pitch
                await dataSource.query(
                    `DELETE FROM reservation WHERE "pitchId" = $1`,
                    [pitch.id]
                );
                // Then delete the pitch
                await dataSource.query(
                    `DELETE FROM pitches WHERE id = $1`,
                    [pitch.id]
                );
            }
            console.log('✅ Deleted duplicate pitches\n');
        }

        // 3. Show remaining data
        const remainingReservations = await dataSource.query(
            `SELECT COUNT(*) as count, type FROM reservation GROUP BY type`
        );

        const remainingPitches = await dataSource.query(
            `SELECT p.name, b.name as business_name 
             FROM pitches p 
             JOIN businesses b ON p.business_id = b.id 
             WHERE b.id = $1`,
            [vefaId]
        );

        console.log('📊 Final State:');
        console.log('\n📍 Reservations:');
        if (remainingReservations.length === 0) {
            console.log('  - No reservations (clean slate!)');
        } else {
            remainingReservations.forEach((r: any) => {
                console.log(`  - ${r.type}: ${r.count}`);
            });
        }

        console.log('\n📍 Vefa Pitches:');
        remainingPitches.forEach((p: any) => {
            console.log(`  - ${p.name}`);
        });

        console.log('\n✅ Database cleanup complete!');
        console.log('\n🎯 Next Steps:');
        console.log('  1. Restart server');
        console.log('  2. Test a real match flow:');
        console.log('     - Create match announcement');
        console.log('     - Accept challenge');
        console.log('     - Check if reservation appears');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await app.close();
    }
}

cleanDatabase();
