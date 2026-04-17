import { NestFactory } from '@nestjs/core';
import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsModule } from '../src/reservations/reservations.module';
import { ReservationsService } from '../src/reservations/reservations.service';
import { ChatModule } from '../src/chat/chat.module';
import { Reservation } from '../src/reservations/entities/reservation.entity';
import { MatchAnnouncement } from '../src/match-announcements/match-announcement.entity';
import { Team } from '../src/teams/team.entity';
import { Pitch } from '../src/pitches/entities/pitch.entity';
import { ChatChannel } from '../src/chat/chat-channel.entity';
import { ChatMessage } from '../src/chat/chat-message.entity';
import { DataSource } from 'typeorm';

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'postgres',
            password: 'postgrespassword',
            database: 'dimli',
            entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
            autoLoadEntities: true,
            synchronize: false,
        }),
        ReservationsModule,
        ChatModule
    ],
})
class VerificationModule { }

async function run() {
    const logger = new Logger('VerificationScript');
    const app = await NestFactory.createApplicationContext(VerificationModule);
    const reservationsService = app.get(ReservationsService);
    const dataSource = app.get(DataSource);

    logger.log('🚀 Starting Verification Script (Robust Mode)...');

    // 1. Get Dependencies
    const team = await dataSource.getRepository(Team).findOne({ where: {} });
    const pitch = await dataSource.getRepository(Pitch).findOne({ relations: ['business'], where: {} });

    if (!team || !pitch) {
        logger.error('❌ Could not find Team or Pitch to create test data.');
        await app.close();
        return;
    }

    // 2. Create a Test Match Announcement (Future Date)
    const futureDate = new Date();
    futureDate.setFullYear(2030); // Far future
    const dateStr = futureDate.toISOString().split('T')[0];
    const timeStr = '12:00';

    const announcement = new MatchAnnouncement();
    announcement.team = team;
    announcement.pitch = pitch;
    announcement.date = dateStr;
    announcement.time = timeStr;
    announcement.playerCount = 7;
    announcement.status = 'PENDING';

    await dataSource.getRepository(MatchAnnouncement).save(announcement);
    logger.log(`Created Test MatchAnnouncement: ${announcement.id}`);

    // 3. Create a Test Chat Channel for this match
    // We need a channel to verify message sending
    const channel = new ChatChannel();
    channel.type = 'MATCH_GROUP';
    channel.name = 'Test Match Channel';
    channel.relatedMatchId = announcement.id;
    await dataSource.getRepository(ChatChannel).save(channel);
    logger.log(`Created Test ChatChannel: ${channel.id}`);

    // 4. Create a Reservation Linked to it
    const reservationDate = new Date(futureDate);
    reservationDate.setHours(12, 0, 0, 0);

    const reservation = new Reservation();
    reservation.pitch = pitch;
    reservation.team = team;
    reservation.slotTime = reservationDate;
    reservation.status = 'PENDING' as any;
    reservation.matchAnnouncementId = announcement.id;

    await dataSource.getRepository(Reservation).save(reservation);
    logger.log(`Created Test Reservation: ${reservation.id}`);

    // 5. Run Approval Test
    try {
        const testNote = "TEST NOTE " + Date.now();
        logger.log(`Approving reservation with note: ${testNote}`);

        await reservationsService.approve(reservation.id, testNote);

        logger.log('✅ Approve method called successfully.');

        // 6. Verify Status
        const updatedRes = await dataSource.getRepository(Reservation).findOne({ where: { id: reservation.id } });
        if (updatedRes?.status === 'APPROVED') {
            logger.log('✅ Reservation status is APPROVED.');
        } else {
            logger.error(`❌ Reservation status is ${updatedRes?.status}`);
        }

        // 7. Verify Message Content
        // We look for a message in the channel that contains our specific test note
        const messages = await dataSource.getRepository(ChatMessage).find({
            where: { channelId: channel.id },
            order: { createdAt: 'DESC' }
        });

        const foundMessage = messages.find(m => m.content.includes(testNote));

        if (foundMessage) {
            logger.log('✅ System message FOUND in channel.');
            console.log('--------------------------------------------------');
            console.log(foundMessage.content);
            console.log('--------------------------------------------------');

            // cleanup
            logger.log('Cleaning up test data...');
            await dataSource.getRepository(ChatMessage).delete({ channelId: channel.id });
            await dataSource.getRepository(Reservation).delete(reservation.id);
            await dataSource.getRepository(ChatChannel).delete(channel.id);
            await dataSource.getRepository(MatchAnnouncement).delete(announcement.id);
            logger.log('Cleanup done.');

        } else {
            logger.error('❌ System message NOT found in channel.');
            console.log('Messages found:', messages.map(m => m.content));
        }

    } catch (error) {
        logger.error('❌ Test failed:', error);
    }

    await app.close();
}

run();
