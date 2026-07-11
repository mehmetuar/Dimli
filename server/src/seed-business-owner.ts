import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessOwnerModule } from './business-owner/business-owner.module';
import { BusinessOwnerService } from './business-owner/business-owner.service';
import { BusinessModule } from './business/business.module';
import { Business } from './business/entities/business.entity';
import * as bcrypt from 'bcrypt';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgrespassword',
      database: 'dimli',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      autoLoadEntities: true,
      synchronize: false,
    }),
    BusinessOwnerModule,
    BusinessModule,
  ],
})
class SeedBusinessOwnerModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    SeedBusinessOwnerModule,
  );

  const businessOwnerService = app.get(BusinessOwnerService);
  const businessRepository = app.get<Repository<Business>>(
    getRepositoryToken(Business),
  );

  console.log('🌱 Seeding Business Owners for ALL businesses...');

  // Get all businesses from database — bypasses the geo-gated public API
  // since this is a one-off seed script, not a customer-facing request.
  const businesses = await businessRepository.find();
  if (!businesses || businesses.length === 0) {
    console.log(
      '❌ No businesses found! Please run seed-real-businesses first.',
    );
    await app.close();
    return;
  }

  console.log(`📍 Found ${businesses.length} businesses`);

  let createdCount = 0;
  let skippedCount = 0;

  // Create owner for EACH business
  for (const business of businesses) {
    // Generate email from business name
    const emailSlug = business.name
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');

    const email = `${emailSlug}@dimli.app`;

    try {
      // Create password hash
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash('test123', salt);

      // Create new owner
      await businessOwnerService.create({
        email: email,
        password: hashedPassword,
        fullName: `${business.name} Yöneticisi`,
        phone: '05XX XXX XX XX',
        business: business,
      });

      console.log(`✅ Created: ${email} → ${business.name}`);
      createdCount++;
    } catch (error) {
      // Business already has an owner (unique constraint on businessId or email)
      const err = error as { code?: string; message?: string };
      if (err.code === '23505') {
        console.log(`✓ Already exists: ${business.name}`);
        skippedCount++;
      } else {
        console.error(`❌ Failed for ${business.name}:`, err.message);
      }
    }
  }

  console.log('\n🎉 Seeding completed!');
  console.log(`   ✅ Created: ${createdCount}`);
  console.log(`   ✓ Skipped: ${skippedCount}`);
  console.log(`   📊 Total: ${businesses.length}`);
  console.log('\n📝 Default password for all accounts: test123');

  await app.close();
}

bootstrap().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
