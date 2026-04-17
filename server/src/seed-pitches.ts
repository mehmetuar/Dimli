
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { Business } from './business/entities/business.entity';
import { Pitch } from './pitches/entities/pitch.entity';

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
            synchronize: false, // We assume schema is already synced
        }),
        TypeOrmModule.forFeature([Business, Pitch]),
    ],
})
class SeedModule { }

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(SeedModule);
    const connection = app.get(Connection);
    const businessRepo = connection.getRepository(Business);
    const pitchRepo = connection.getRepository(Pitch);

    console.log('🌱 Seeding Business and Pitches...');

    try {
        const businessesData = [
            {
                name: 'Mega Halı Saha',
                location: 'Üsküdar',
                phone: '0555-111-2233',
                rating: 4.8,
                facilities: ['Duş', 'Kafeterya', 'Otopark', 'Video'],
                pitches: [
                    {
                        name: "1 No'lu Saha",
                        type: 'OUTDOOR',
                        pricePerHour: 1200,
                        imageUrl: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
                    },
                    {
                        name: "2 No'lu Saha",
                        type: 'INDOOR',
                        pricePerHour: 1400,
                        imageUrl: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
                    }
                ]
            },
            {
                name: 'Kadıköy Arena',
                location: 'Kadıköy',
                phone: '0216-333-4455',
                rating: 4.5,
                facilities: ['Duş', 'Krampon Kiralama', 'Video Kaydı', 'Tribün'],
                pitches: [
                    {
                        name: "Merkez Saha",
                        type: 'OUTDOOR',
                        pricePerHour: 1300,
                        imageUrl: 'https://images.unsplash.com/photo-1556056504-5c7696c4c28d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
                    }
                ]
            },
            {
                name: 'Beşiktaş Çim Saha',
                location: 'Beşiktaş',
                phone: '0212-222-3344',
                rating: 4.9,
                facilities: ['Duş', 'Otopark', 'Büfe'],
                pitches: [
                    {
                        name: "Vodafone Yanı",
                        type: 'OUTDOOR',
                        pricePerHour: 1500,
                        imageUrl: 'https://images.unsplash.com/photo-1510563800743-aed236490d94?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
                    },
                    {
                        name: "Antrenman Sahası",
                        type: 'INDOOR',
                        pricePerHour: 1100,
                        imageUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
                    }
                ]
            }
        ];

        for (const bData of businessesData) {
            // Find business by name
            const existingBusiness = await businessRepo.findOne({ where: { name: bData.name } });
            let business = existingBusiness;

            if (!business) {
                business = businessRepo.create({
                    name: bData.name,
                    city: bData.location, // Mapping location to city for simplicity or add location field
                    phone: bData.phone,
                    rating: bData.rating
                });
                business = await businessRepo.save(business);
                console.log(`✅ Created Business: ${business.name}`);
            } else {
                console.log(`ℹ️ Business already exists: ${business.name}`);
            }

            if (business && business.id) {
                // Determine facilities
                const inheritedFacilities = bData.facilities || [];

                for (const pData of bData.pitches) {
                    const existingPitch = await pitchRepo.findOne({
                        where: { name: pData.name, business: { id: business.id } },
                        relations: ['business']
                    });

                    const pitchFacilities = [...inheritedFacilities];

                    if (!existingPitch) {
                        try {
                            const pitch = pitchRepo.create({
                                ...pData,
                                facilities: pitchFacilities,
                                business: business
                            });
                            await pitchRepo.save(pitch);
                            console.log(`  ✅ Created Pitch: ${pitch.name}`);
                        } catch (err) {
                            console.error(`  ❌ Failed to create pitch ${pData.name}:`, err);
                        }
                    } else {
                        console.log(`  🔄 Updating existing pitch: ${pData.name}`);
                        try {
                            existingPitch.pricePerHour = pData.pricePerHour;
                            existingPitch.imageUrl = pData.imageUrl;
                            existingPitch.facilities = pitchFacilities;
                            await pitchRepo.save(existingPitch);
                            console.log(`  ✅ Updated Pitch: ${pData.name}`);
                        } catch (err) {
                            console.error(`  ❌ Failed to update pitch ${pData.name}:`, err);
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
