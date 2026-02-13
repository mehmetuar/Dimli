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

    console.log('🗑️  Deleting Empty Businesses (no pitches)...\n');

    try {
        // Get all businesses
        const businessRepo = connection.getRepository('Business');
        const allBusinesses: any[] = await businessRepo.find({ relations: ['pitches'] });

        // Filter businesses with no pitches
        const emptyBusinesses = allBusinesses.filter(b => !b.pitches || b.pitches.length === 0);

        if (emptyBusinesses.length === 0) {
            console.log('✅ No empty businesses found!\n');
            await app.close();
            return;
        }

        console.log(`📍 Found ${emptyBusinesses.length} empty businesses:\n`);
        emptyBusinesses.forEach((b: any) => console.log(`   - ${b.name} (${b.district})`));
        console.log('');

        // Delete each empty business and its owner
        const ownerRepo = connection.getRepository('BusinessOwner');

        for (const business of emptyBusinesses) {
            try {
                // Try to delete business owner first (if exists)
                const owner = await ownerRepo.findOne({ where: { business: { id: business.id } } });
                if (owner) {
                    await ownerRepo.remove(owner);
                    console.log(`   ✅ Deleted owner for: ${business.name}`);
                }
            } catch (err) {
                console.log(`   ⚠️  No owner found for: ${business.name}`);
            }

            // Delete business
            try {
                await businessRepo.remove(business);
                console.log(`   ✅ Deleted business: ${business.name}`);
            } catch (err) {
                console.error(`   ❌ Failed to delete ${business.name}:`, err.message);
            }
        }

        console.log('\n🎉 Cleanup Complete!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
