import { DataSource } from 'typeorm';

async function updateVefaData() {
    const dataSource = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: '123456',
        database: 'sahapro',
        entities: ['src/**/*.entity.ts'],
        synchronize: false,
    });

    await dataSource.initialize();
    console.log('✅ Database connected');

    try {
        // 1. Find Vefa Spor Tesisleri by name
        const business = await dataSource.query(
            `SELECT * FROM businesses WHERE name LIKE '%Vefa%' LIMIT 1`
        );

        if (!business || business.length === 0) {
            console.log('❌ Vefa Spor Tesisleri not found');
            return;
        }

        const businessId = business[0].id;
        console.log('🏢 Found business:', business[0].name, businessId);

        // 2. Update Business Hours
        await dataSource.query(
            `UPDATE businesses SET "openTime" = '09:00', "closeTime" = '23:00' WHERE id = $1`,
            [businessId]
        );
        console.log('✅ Updated business hours: 09:00 - 23:00');

        // 3. Check existing pitches
        const existingPitches = await dataSource.query(
            `SELECT * FROM pitches WHERE business_id = $1`,
            [businessId]
        );
        console.log(`📊 Existing pitches: ${existingPitches.length}`);

        // 4. Add/Update Pitches (3 total)
        const pitchesData = [
            {
                name: 'Saha 1',
                description: 'Profesyonel kalite halı saha, son teknoloji zemin',
                pricePerHour: 800,
                facilities: ['Duş', 'Soyunma Odası', 'Tribün', 'Aydınlatma', 'Otopark']
            },
            {
                name: 'Saha 2',
                description: 'Orta boy halı saha, turnuva organizasyonları için uygun',
                pricePerHour: 650,
                facilities: ['Duş', 'Soyunma Odası', 'Aydınlatma', 'Otopark']
            },
            {
                name: 'Saha 3',
                description: 'Ekonomik halı saha, antrenman ve dostluk maçları için',
                pricePerHour: 500,
                facilities: ['Soyunma Odası', 'Aydınlatma', 'Otopark']
            }
        ];

        for (const [index, pitchData] of pitchesData.entries()) {
            if (existingPitches[index]) {
                // Update existing
                await dataSource.query(
                    `UPDATE pitches SET 
                        name = $1, 
                        description = $2, 
                        price_per_hour = $3, 
                        facilities = $4 
                    WHERE id = $5`,
                    [
                        pitchData.name,
                        pitchData.description,
                        pitchData.pricePerHour,
                        pitchData.facilities,
                        existingPitches[index].id
                    ]
                );
                console.log(`✅ Updated ${pitchData.name}`);
            } else {
                // Insert new
                const result = await dataSource.query(
                    `INSERT INTO pitches (name, description, price_per_hour, facilities, business_id) 
                     VALUES ($1, $2, $3, $4, $5) 
                     RETURNING id`,
                    [
                        pitchData.name,
                        pitchData.description,
                        pitchData.pricePerHour,
                        pitchData.facilities,
                        businessId
                    ]
                );
                console.log(`✅ Created ${pitchData.name}:`, result[0].id);
            }
        }

        console.log('\n🎉 Vefa Spor Tesisleri data updated successfully!');
        console.log('📋 Summary:');
        console.log('  - Business hours: 09:00 - 23:00');
        console.log('  - Pitches: 3 (800₺, 650₺, 500₺)');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await dataSource.destroy();
    }
}

updateVefaData();
