import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsModule } from './reservations/reservations.module';
import { ReservationsService } from './reservations/reservations.service';

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
        ReservationsModule,
    ],
})
class SeedReservationsModule { }

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(SeedReservationsModule);

    const reservationsService = app.get(ReservationsService);

    console.log('🌱 Seeding Test Reservations...');

    // Vefa Spor Tesisleri pitch IDs (from DB query)
    const pitch1Id = 'db1c83f8-1c88-457f-8b00-b8938beb600a'; // 1 Nolu Halı Saha
    const pitch2Id = '648df6b9-1514-49e8-91f5-197da1ca15e0'; // 2 Nolu Halı Saha

    // Get some team IDs from the database
    const { DataSource } = await import('typeorm');
    const dataSource = app.get(DataSource);

    const teams = await dataSource.query('SELECT id, name FROM team LIMIT 5');

    if (teams.length === 0) {
        console.log('❌ No teams found! Please create teams first.');
        await app.close();
        return;
    }

    console.log(`📍 Found ${teams.length} teams`);

    // Create reservations for today and tomorrow
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // TODAY - Pitch 1
    // 10:00 - PENDING (2 requests from different teams)
    await createReservation(reservationsService, pitch1Id, teams[0].id, null, today, 10, 'PENDING');
    await createReservation(reservationsService, pitch1Id, teams[1].id, null, today, 10, 'PENDING');

    // 14:00 - APPROVED (1 approved)
    await createReservation(reservationsService, pitch1Id, teams[2].id, null, today, 14, 'APPROVED');

    // 18:00 - PENDING (3 requests)
    await createReservation(reservationsService, pitch1Id, teams[0].id, null, today, 18, 'PENDING');
    await createReservation(reservationsService, pitch1Id, teams[1].id, null, today, 18, 'PENDING');
    await createReservation(reservationsService, pitch1Id, teams[3].id, null, today, 18, 'PENDING');

    // TODAY - Pitch 2
    // 11:00 - PENDING
    await createReservation(reservationsService, pitch2Id, teams[1].id, null, today, 11, 'PENDING');

    // 16:00 - APPROVED
    await createReservation(reservationsService, pitch2Id, teams[4].id, null, today, 16, 'APPROVED');

    // TOMORROW - Pitch 1
    // 12:00 - PENDING (1 request)
    await createReservation(reservationsService, pitch1Id, teams[2].id, null, tomorrow, 12, 'PENDING');

    // 20:00 - APPROVED
    await createReservation(reservationsService, pitch1Id, teams[3].id, null, tomorrow, 20, 'APPROVED');

    console.log('✅ Successfully created test reservations!');
    console.log('');
    console.log('📊 Summary:');
    console.log('  - Today: 8 reservations (6 PENDING, 2 APPROVED)');
    console.log('  - Tomorrow: 2 reservations (1 PENDING, 1 APPROVED)');
    console.log('');
    console.log('🎯 Test Dashboard:');
    console.log('  1. Login as owner@dimli.app');
    console.log('  2. Select today\'s date');
    console.log('  3. You should see:');
    console.log('     - Orange (blinking) slots: 10:00, 11:00, 18:00');
    console.log('     - Red (full) slots: 14:00, 16:00');

    await app.close();
}

async function createReservation(
    service: ReservationsService,
    pitchId: string,
    teamId: string,
    opponentTeamId: string | null,
    date: Date,
    hour: number,
    status: 'PENDING' | 'APPROVED'
) {
    const slotTime = new Date(date);
    slotTime.setHours(hour, 0, 0, 0);

    const { DataSource } = await import('typeorm');
    const dataSource = service['reservationRepository'].manager.connection;

    await dataSource.query(
        `INSERT INTO reservation ("slotTime", status, "pitchId", "teamId", "opponentTeamId", "createdAt") 
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [slotTime, status, pitchId, teamId, opponentTeamId]
    );

    console.log(`  ✓ Created ${status} reservation for ${slotTime.toISOString().split('T')[0]} ${hour}:00`);
}

bootstrap().catch(err => {
    console.error('Error during seeding:', err);
    process.exit(1);
});
