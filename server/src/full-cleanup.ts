import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Connection } from 'typeorm';
import * as crypto from 'crypto';

// Polyfill for Node < 19
if (!global.crypto) {
    Object.defineProperty(global, 'crypto', {
        value: {
            randomUUID: () => crypto.randomUUID()
        }
    });
}

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const connection = app.get(Connection);

    console.log('🗑️  Starting FULL Database Cleanup (Cascade Delete)...\n');

    // 1. Delete all match announcements (foreign key to pitches)
    try {
        console.log('1️⃣  Deleting all match announcements...');
        await connection.query('DELETE FROM match_announcements');
        console.log('   ✅ Match announcements deleted\n');
    } catch (err) {
        console.log('   ⚠️  Table might not exist or already empty\n');
    }

    // 2. Delete all reservations (foreign key to pitches) - singular table name
    try {
        console.log('2️⃣  Deleting all reservations...');
        await connection.query('DELETE FROM reservation');
        console.log('   ✅ Reservations deleted\n');
    } catch (err) {
        console.log('   ⚠️  Table might not exist or already empty\n');
    }

    // 3. Delete all challenges (might have references) - singular table name
    try {
        console.log('3️⃣  Deleting all challenges...');
        await connection.query('DELETE FROM challenge');
        console.log('   ✅ Challenges deleted\n');
    } catch (err) {
        console.log('   ⚠️  Table might not exist or already empty\n');
    }

    // 4. Delete all business owners
    try {
        console.log('4️⃣  Deleting all business owners...');
        await connection.query('DELETE FROM business_owner');
        console.log('   ✅ Business owners deleted\n');
    } catch (err) {
        console.log('   ⚠️  Table might not exist or already empty\n');
    }

    // 5. Delete all pitches
    try {
        console.log('5️⃣  Deleting all pitches...');
        await connection.query('DELETE FROM pitches');
        console.log('   ✅ Pitches deleted\n');
    } catch (err) {
        console.log('   ⚠️  Table might not exist or already empty\n');
    }

    // 6. Delete all businesses
    try {
        console.log('6️⃣  Deleting all businesses...');
        await connection.query('DELETE FROM business');
        console.log('   ✅ Businesses deleted\n');
    } catch (err) {
        console.log('   ⚠️  Table might not exist or already empty\n');
    }

    console.log('🎉 Full Cleanup Complete!');
    console.log('📝 Next step: Run seed-real-businesses.ts\n');

    await app.close();
}

bootstrap();
