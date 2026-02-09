
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BusinessService } from './business/business.service';
import { PitchesService } from './pitches/pitches.service';
import { Business } from './business/entities/business.entity';
import { Pitch } from './pitches/entities/pitch.entity';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const businessService = app.get(BusinessService);
    const pitchesService = app.get(PitchesService);

    console.log('🌱 Seeding Business and Pitches...');

    try {
        const businessesData = [
            {
                name: 'Mega Halı Saha',
                location: 'Üsküdar',
                phone: '0555-111-2233',
                rating: 4.8,
                pitches: [
                    {
                        name: "1 No'lu Saha",
                        type: 'OUTDOOR',
                        pricePerHour: 1200,
                        imageUrl: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
                        facilities: ['Duş', 'Kafeterya', 'Otopark', 'Wifi', 'Tribün']
                    },
                    {
                        name: "2 No'lu Saha",
                        type: 'INDOOR',
                        pricePerHour: 1400,
                        imageUrl: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
                        facilities: ['Duş', 'Kafeterya', 'Otopark', 'Isıtma']
                    }
                ]
            },
            {
                name: 'Kadıköy Arena',
                location: 'Kadıköy',
                phone: '0216-333-4455',
                rating: 4.5,
                pitches: [
                    {
                        name: "Merkez Saha",
                        type: 'OUTDOOR',
                        pricePerHour: 1300,
                        imageUrl: 'https://images.unsplash.com/photo-1556056504-5c7696c4c28d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
                        facilities: ['Duş', 'Otopark', 'Servis', 'Kamera Kaydı']
                    }
                ]
            },
            {
                name: 'Beşiktaş Çim Saha',
                location: 'Beşiktaş',
                phone: '0212-222-3344',
                rating: 4.9,
                pitches: [
                    {
                        name: "Vodafone Yanı",
                        type: 'OUTDOOR',
                        pricePerHour: 1500,
                        imageUrl: 'https://images.unsplash.com/photo-1510563800743-aed236490d94?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
                        facilities: ['Duş', 'Kafeterya', 'Val', 'Premium Soyunma Odası', 'Krampon Kiralama']
                    },
                    {
                        name: "Antrenman Sahası",
                        type: 'INDOOR',
                        pricePerHour: 1100,
                        imageUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
                        facilities: ['Duş', 'Otopark']
                    }
                ]
            }
        ];

        for (const bData of businessesData) {
            const existingBusinesses = await businessService.findAll();
            let business = existingBusinesses.find((b: Business) => b.name === bData.name);

            if (!business) {
                // Explicitly cast to unknown then Business to avoid overlap errors / undefined checks
                const created = await businessService.create({
                    name: bData.name,
                    location: bData.location,
                    phone: bData.phone,
                    rating: bData.rating
                });
                business = created as unknown as Business;
                console.log(`✅ Created Business: ${business.name}`);
            } else {
                console.log(`ℹ️ Business already exists: ${business.name}`);
            }

            if (business && business.id) {
                const existingPitches = await pitchesService.findByBusiness(business.id);
                for (const pData of bData.pitches) {
                    const exists = existingPitches.find((p: Pitch) => p.name === pData.name);
                    if (!exists) {
                        try {
                            const createdPitch = await pitchesService.create({
                                ...pData,
                                businessId: business.id
                            });
                            // Cast to Pitch to ensure we access name safely
                            const pitch = createdPitch as unknown as Pitch;

                            console.log(`  ✅ Created Pitch: ${pitch.name} with Facilities: ${pitch.facilities?.join(', ')}`);
                        } catch (err) {
                            console.error(`  ❌ Failed to create pitch ${pData.name}:`, err);
                        }
                    } else {
                        console.log(`  🔄 Updating existing pitch: ${pData.name}`);
                        if (exists && exists.id) {
                            try {
                                await pitchesService.update(exists.id, {
                                    pricePerHour: pData.pricePerHour,
                                    imageUrl: pData.imageUrl,
                                    facilities: pData.facilities
                                });
                                console.log(`  ✅ Updated Pitch: ${pData.name}`);
                            } catch (err) {
                                console.error(`  ❌ Failed to update pitch ${pData.name}:`, err);
                            }
                        }
                    }
                }
            } else {
                console.error(`❌ Business ${bData.name} not found or created properly.`);
            }
        }

    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
