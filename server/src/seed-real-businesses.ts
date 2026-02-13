import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Connection } from 'typeorm';
import { Business } from './business/entities/business.entity';
import { Pitch } from './pitches/entities/pitch.entity';
import * as crypto from 'crypto';

// Polyfill for Node < 19
if (!global.crypto) {
    Object.defineProperty(global, 'crypto', {
        value: {
            randomUUID: () => crypto.randomUUID()
        }
    });
}

// Real Istanbul Sports Complexes Data
const REAL_BUSINESSES = [
    {
        name: "Vefa Spor Tesisleri",
        city: "İstanbul",
        district: "Fatih",
        address: "Vefa, Haliç Cd. No:1, 34080 Fatih/İstanbul",
        latitude: 41.0205,
        longitude: 28.9584,
        phone: "02125213456",
        openTime: "09:00",
        closeTime: "24:00",
        rating: 4.8,
        coverImageUrl: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
        logoUrl: "https://ui-avatars.com/api/?name=Vefa+Spor&background=0D8ABC&color=fff",
        facilities: ["Duş", "Otopark", "Kafeterya", "Mescit", "Tribün"],
        pitches: [
            {
                name: "1 Nolu Halı Saha",
                type: "OUTDOOR",
                pricePerHour: 1400,
                imageUrl: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
            },
            {
                name: "2 Nolu Halı Saha",
                type: "OUTDOOR",
                pricePerHour: 1400,
                imageUrl: "https://images.unsplash.com/photo-1551958219-acbc608c6377?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
            }
        ]
    },
    {
        name: "Yeldeğirmeni Spor Kompleksi",
        city: "İstanbul",
        district: "Kadıköy",
        address: "Rasimpaşa, İzzettin Sk. No:50, 34716 Kadıköy/İstanbul",
        latitude: 40.9950,
        longitude: 29.0300,
        phone: "02163456789",
        openTime: "08:00",
        closeTime: "24:00",
        rating: 4.6,
        coverImageUrl: "https://images.unsplash.com/photo-1570498839593-e565b39455fc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
        logoUrl: "https://ui-avatars.com/api/?name=Yeldegirmeni+Spor&background=F39C12&color=fff",
        facilities: ["Duş", "Soyunma Odası", "Kafeterya"],
        pitches: [
            {
                name: "Tarihi Saha",
                type: "OUTDOOR",
                pricePerHour: 1500,
                imageUrl: "https://images.unsplash.com/photo-1570498839593-e565b39455fc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
            }
        ]
    },
    {
        name: "Beşiktaş Belediyesi Çilekli Tesisleri",
        city: "İstanbul",
        district: "Beşiktaş",
        address: "Akat, 34335 Beşiktaş/İstanbul",
        latitude: 41.0825,
        longitude: 29.0250,
        phone: "02123512345",
        openTime: "08:00",
        closeTime: "23:00",
        rating: 4.7,
        coverImageUrl: "https://images.unsplash.com/photo-1624880357913-a8539238245b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
        logoUrl: "https://ui-avatars.com/api/?name=Cilekli+Tesisleri&background=000&color=fff",
        facilities: ["Duş", "Otopark", "Kafeterya", "Tribün", "Profesyonel Aydınlatma"],
        pitches: [
            {
                name: "Büyük Saha (11v11)",
                type: "OUTDOOR",
                pricePerHour: 2500,
                imageUrl: "https://images.unsplash.com/photo-1624880357913-a8539238245b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
            },
            {
                name: "Halı Saha 1",
                type: "OUTDOOR",
                pricePerHour: 1600,
                imageUrl: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
            },
            {
                name: "Halı Saha 2",
                type: "OUTDOOR",
                pricePerHour: 1600,
                imageUrl: "https://images.unsplash.com/photo-1551958219-acbc608c6377?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
            }
        ]
    }
];

async function bootstrap() {
    // 1. Create independent AppContext
    const app = await NestFactory.createApplicationContext(AppModule);
    const connection = app.get(Connection);

    console.log('🌱 Starting Seed: Real Business Data...');

    const businessRepo = connection.getRepository(Business);
    const pitchRepo = connection.getRepository(Pitch);

    // 2. Iterate and Seed Businesses
    for (const businessData of REAL_BUSINESSES) {
        // Check if business already exists (by name) to avoid duplicates on re-run
        const existingBusiness = await businessRepo.findOne({ where: { name: businessData.name } });

        let business;

        if (existingBusiness) {
            console.log(`⚠️ Business already exists: ${businessData.name} - Updating...`);
            // Update existing business details
            Object.assign(existingBusiness, {
                city: businessData.city,
                district: businessData.district,
                address: businessData.address,
                latitude: businessData.latitude,
                longitude: businessData.longitude,
                phone: businessData.phone,
                openTime: businessData.openTime,
                closeTime: businessData.closeTime,
                rating: businessData.rating,
                coverImageUrl: businessData.coverImageUrl,
                logoUrl: businessData.logoUrl,
                // facilities removed from business
            });
            business = await businessRepo.save(existingBusiness);
        } else {
            // Create new business
            business = businessRepo.create({
                name: businessData.name,
                city: businessData.city,
                district: businessData.district,
                address: businessData.address,
                latitude: businessData.latitude,
                longitude: businessData.longitude,
                phone: businessData.phone,
                openTime: businessData.openTime,
                closeTime: businessData.closeTime,
                rating: businessData.rating,
                coverImageUrl: businessData.coverImageUrl,
                logoUrl: businessData.logoUrl,
                // facilities removed from business
            });
            business = await businessRepo.save(business);
            console.log(`✅ Business Created: ${business.name}`);
        }

        // 🆕 3. DELETE old pitches that are NOT in the current seed data
        // This prevents duplicate/stale pitches from accumulating
        const existingPitches = await pitchRepo.find({
            where: { business: { id: business.id } },
            relations: ['business']
        });

        const seedPitchNames = businessData.pitches.map(p => p.name);
        const pitchesToDelete = existingPitches.filter(
            p => !seedPitchNames.includes(p.name)
        );

        if (pitchesToDelete.length > 0) {
            console.log(`   🗑️  Removing ${pitchesToDelete.length} old pitch(es): ${pitchesToDelete.map(p => p.name).join(', ')}`);
            await pitchRepo.remove(pitchesToDelete);
        }

        // 4. Create/Update Pitches for this Business
        // Assign business facilities to pitches for now (inheriting)
        // In real scenario, each pitch could have specific facilities
        const inheritedFacilities = businessData.facilities || [];

        for (const pitchData of businessData.pitches) {
            const existingPitch = await pitchRepo.findOne({
                where: {
                    name: pitchData.name,
                    business: { id: business.id }
                },
                relations: ['business']
            });

            // Pitch specific facilities + inherited ones (if we want to split later, we can)
            // For now, just using the business facilities on the pitch
            const pitchFacilities = [...inheritedFacilities];

            if (existingPitch) {
                console.log(`   🔹 Pitch exists: ${pitchData.name}`);
                // Update if needed
                existingPitch.pricePerHour = pitchData.pricePerHour;
                existingPitch.imageUrl = pitchData.imageUrl;
                existingPitch.type = pitchData.type;
                existingPitch.facilities = pitchFacilities;
                await pitchRepo.save(existingPitch);
            } else {
                const pitch = pitchRepo.create({
                    name: pitchData.name,
                    type: pitchData.type,
                    pricePerHour: pitchData.pricePerHour,
                    imageUrl: pitchData.imageUrl,
                    facilities: pitchFacilities,
                    business: business
                });
                await pitchRepo.save(pitch);
                console.log(`   🔸 Pitch Created: ${pitch.name} (${pitch.pricePerHour} TL)`);
            }
        }
    }

    console.log('🎉 Seeding Complete!');
    await app.close();
}

bootstrap();
