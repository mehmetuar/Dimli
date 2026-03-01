import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In, LessThan, MoreThan, Between, MoreThanOrEqual } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { ChatService } from '../chat/chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Notification } from '../notifications/notification.entity';
import { ChatChannel } from '../chat/chat-channel.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Pitch } from '../pitches/entities/pitch.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ReservationsService {
    private readonly logger = new Logger(ReservationsService.name);

    constructor(
        @InjectRepository(Reservation)
        private reservationRepository: Repository<Reservation>,
        @InjectRepository(Pitch)
        private pitchRepository: Repository<Pitch>,
        @InjectRepository(BusinessOwner)
        private businessOwnerRepository: Repository<BusinessOwner>,
        @InjectRepository(MatchAnnouncement)
        private matchAnnouncementRepository: Repository<MatchAnnouncement>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private chatService: ChatService,
        private notificationsService: NotificationsService,
        @InjectRepository(ChatChannel)
        private chatChannelRepository: Repository<ChatChannel>,
        private dataSource: DataSource
    ) { }

    // ... existing methods ...

    @Cron(CronExpression.EVERY_MINUTE)
    async checkMatchReminders() {
        const now = new Date();
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const twoHoursFiveMinutesFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000 + 5 * 60 * 1000);

        const reservations = await this.reservationRepository.find({
            where: {
                status: ReservationStatus.APPROVED,
                reminderSent: false,
                slotTime: Between(twoHoursFromNow, twoHoursFiveMinutesFromNow)
            },
            relations: ['team', 'team.players', 'opponentTeam', 'opponentTeam.players', 'pitch', 'pitch.business']
        });

        if (reservations.length > 0) {
            this.logger.log(`Found ${reservations.length} matches starting in ~2 hours. Sending reminders...`);
        }

        for (const reservation of reservations) {
            const playersToNotify: any[] = [];

            // Add Team A players
            if (reservation.team?.players) {
                playersToNotify.push(...reservation.team.players);
            }

            // Add Team B players
            if (reservation.opponentTeam?.players) {
                playersToNotify.push(...reservation.opponentTeam.players);
            }

            const timeStr = reservation.slotTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            const pitchName = reservation.pitch?.name || 'Saha';
            const businessName = reservation.pitch?.business?.name || 'İşletme';

            // Send notifications
            for (const player of playersToNotify) {
                await this.notificationsService.create({
                    userId: player.id,
                    type: 'MATCH_REMINDER',
                    title: '⏳ Maçın Başlamasına 2 Saat Kaldı!',
                    message: `${businessName} - ${pitchName} sahasındaki maçınız saat ${timeStr}'da başlayacak. Hazırlanmayı unutmayın!`,
                    relatedId: reservation.id,
                    read: false,
                    metadata: {
                        reservationId: reservation.id,
                        matchTime: timeStr,
                        pitchName
                    }
                });
            }

            // Mark as sent
            reservation.reminderSent = true;
            await this.reservationRepository.save(reservation);
        }
    }


    async create(createReservationDto: any) {
        const reservation = this.reservationRepository.create(createReservationDto);
        const savedReservation = await this.reservationRepository.save(reservation) as unknown as Reservation;

        // Notify Business Owner
        try {
            const pitch = await this.pitchRepository.findOne({
                where: { id: (savedReservation as any).pitchId },
                relations: ['business']
            });

            if (pitch && pitch.business) {
                const owner = await this.businessOwnerRepository.findOne({
                    where: { business: { id: pitch.business.id } }
                });

                if (owner) {
                    const slotTime = new Date((savedReservation as any).slotTime);
                    const dateStr = slotTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
                    const timeStr = slotTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                    await this.notificationsService.create({
                        userId: owner.id,
                        type: 'RESERVATION_REQUEST',
                        title: 'Yeni Rezervasyon İsteği!',
                        message: `${pitch.name} için ${dateStr} saat ${timeStr} dilimine yeni bir istek var.`,
                        relatedId: (savedReservation as any).id,
                        read: false,
                        metadata: {
                            reservationId: (savedReservation as any).id,
                            pitchName: pitch.name,
                            date: dateStr,
                            time: timeStr,
                            role: 'BUSINESS_OWNER'
                        }
                    });
                    this.logger.log(`Notification sent to business owner ${owner.id} for reservation ${(savedReservation as any).id}`);
                }
            }
        } catch (error) {
            this.logger.error('Failed to send business owner notification', error);
        }

        return savedReservation;
    }

    async findAll() {
        return this.reservationRepository.find();
    }

    // Find all reservations for a specific pitch on a specific date (range)
    async findByPitchAndDate(pitchId: string, start: Date, end: Date) {
        return this.reservationRepository.createQueryBuilder('reservation')
            .leftJoinAndSelect('reservation.pitch', 'pitch')
            .leftJoinAndSelect('reservation.team', 'team')
            .leftJoinAndSelect('team.captain', 'teamCaptain')
            .leftJoinAndSelect('reservation.opponentTeam', 'opponentTeam')
            .leftJoinAndSelect('opponentTeam.captain', 'opponentCaptain')
            .leftJoinAndSelect('reservation.matchAnnouncement', 'matchAnnouncement')
            .where('reservation.pitchId = :pitchId', { pitchId })
            .andWhere('reservation.slotTime >= :start', { start })
            .andWhere('reservation.slotTime <= :end', { end })
            .andWhere('reservation.status != :status', { status: ReservationStatus.CANCELLED })
            .orderBy('reservation.slotTime', 'ASC')
            .getMany();
    }

    async findPendingBySlot(pitchId: string, slotTime: Date) {
        return this.reservationRepository.find({
            where: {
                pitch: { id: pitchId },
                slotTime: slotTime,
                status: ReservationStatus.PENDING
            },
            relations: ['team']
        });
    }

    async approve(id: string, businessNote?: string) {
        this.logger.log(`Approval process started for reservation: ${id}`);

        return this.dataSource.transaction(async (manager) => {
            // 1. Fetch the reservation with all necessary relations
            const reservation = await manager.findOne(Reservation, {
                where: { id },
                relations: ['pitch', 'pitch.business', 'pitch.timeSlots', 'team', 'team.captain', 'team.players', 'opponentTeam', 'opponentTeam.players']
            });

            if (!reservation) {
                this.logger.error(`Reservation not found: ${id}`);
                throw new Error('Reservation not found');
            }

            // 1.1 Allow Re-approval of REJECTED reservations if slot is free
            if (reservation.status !== ReservationStatus.PENDING && reservation.status !== ReservationStatus.REJECTED) {
                throw new Error('Sadece beklemede veya reddedilmiş rezervasyonlar onaylanabilir.');
            }

            this.logger.log(`Reservation found. Pitch: ${reservation.pitch?.name}, Business: ${reservation.pitch?.business?.name}`);

            // 2. STRICT DOUBLE BOOKING CHECK (Time Range)
            const approvalTime = new Date(reservation.slotTime);
            const windowStart = new Date(approvalTime.getTime() - 15 * 60000); // -15 mins
            const windowEnd = new Date(approvalTime.getTime() + 15 * 60000);   // +15 mins

            const existingApproved = await manager.findOne(Reservation, {
                where: {
                    pitchId: reservation.pitchId,
                    status: ReservationStatus.APPROVED,
                    slotTime: Between(windowStart, windowEnd)
                }
            });

            if (existingApproved) {
                if (existingApproved.id !== id) {
                    this.logger.warn(`Time conflict detected for reservation ${id} with existing approved reservation ${existingApproved.id}`);
                    throw new Error('Bu saat dilimi için zaten onaylanmış bir maç var! (Zaman çakışması)');
                }
            }

            // 3. Approve this reservation
            reservation.status = ReservationStatus.APPROVED;
            await manager.save(reservation);
            this.logger.log(`Reservation ${id} status updated to APPROVED.`);

            // 4. PREPARE AND SEND SYSTEM MESSAGE (Success)
            if (reservation.matchAnnouncementId) {
                // Determine Business Name and Pitch Name
                const businessName = reservation.pitch?.business?.name || 'İşletme';
                const pitchName = reservation.pitch?.name || 'Saha';

                // Format Date with Day Name
                const dayName = approvalTime.toLocaleDateString('tr-TR', { weekday: 'long' });
                const dateStr = approvalTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
                const startTimeStr = approvalTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                // Calculate end time from pitch time slots or default +1 hour
                let endTimeStr = '';
                const timeSlots = reservation.pitch?.timeSlots;
                if (timeSlots && timeSlots.length > 0) {
                    const matchingSlot = timeSlots.find(slot => slot.startTime === startTimeStr);
                    if (matchingSlot) {
                        endTimeStr = matchingSlot.endTime;
                    }
                }
                if (!endTimeStr) {
                    const endTime = new Date(approvalTime.getTime() + 60 * 60 * 1000);
                    endTimeStr = endTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                }

                // Construct Message with full details
                let messageContent = `Maçınız kesinleşti! {{FOOTBALL}}\n\n` +
                    `{{STADIUM}} ${businessName}\n` +
                    `{{PIN}} ${pitchName}\n` +
                    `{{CALENDAR}} ${dateStr} ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}\n` +
                    `{{CLOCK}} ${startTimeStr} - ${endTimeStr}`;

                // Add Business Note if exists
                if (businessNote && businessNote.trim() !== '') {
                    messageContent += `\n\n{{COMMENT}} İşletme Notu:\n${businessNote}`;
                }

                this.logger.log(`Sending approval system message for matchAnnouncementId: ${reservation.matchAnnouncementId}`);

                await this.sendSystemMessage(
                    manager,
                    reservation.matchAnnouncementId,
                    reservation.team,
                    messageContent,
                    { type: 'MATCH_APPROVED', reservationId: reservation.id }
                );
            } else {
                this.logger.warn(`No matchAnnouncementId found for reservation ${id}, skipping chat message.`);
            }

            // 4.5 SEND NOTIFICATIONS TO ALL TEAM PLAYERS
            try {
                const businessName = reservation.pitch?.business?.name || 'İşletme';
                const pitchName = reservation.pitch?.name || 'Saha';
                const notifDayName = approvalTime.toLocaleDateString('tr-TR', { weekday: 'long' });
                const notifDateStr = approvalTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
                const notifTimeStr = approvalTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                const playersToNotify: any[] = [];
                if (reservation.team?.players) {
                    playersToNotify.push(...reservation.team.players);
                }
                if (reservation.opponentTeam?.players) {
                    playersToNotify.push(...reservation.opponentTeam.players);
                }

                for (const player of playersToNotify) {
                    await this.notificationsService.create({
                        userId: player.id,
                        type: 'SYSTEM',
                        title: '⚽ Maçınız Kesinleşti!',
                        message: `${businessName} - ${pitchName}\n${notifDateStr} ${notifDayName.charAt(0).toUpperCase() + notifDayName.slice(1)} | ${notifTimeStr}\n\nTakımım sayfasından yaklaşan maçlarınızı görüntüleyebilirsiniz. İyi oyunlar! 🏆`,
                        relatedId: reservation.id,
                        read: false,
                        metadata: {
                            type: 'MATCH_APPROVED',
                            reservationId: reservation.id
                        }
                    });
                }
                this.logger.log(`Sent MATCH_APPROVED notifications to ${playersToNotify.length} players.`);
            } catch (error) {
                this.logger.error('Failed to send player notifications:', error);
            }

            // 5. Reject others for the same slot (PASSIVE STATE)
            const others = await manager.find(Reservation, {
                where: {
                    pitchId: reservation.pitchId,
                    slotTime: Between(windowStart, windowEnd),
                    status: ReservationStatus.PENDING
                },
                relations: ['team', 'team.captain']
            });

            if (others.length > 0) {
                this.logger.log(`Rejecting ${others.length} conflicting pending reservations.`);
                for (const other of others) {
                    if (other.id !== id) {
                        other.status = ReservationStatus.REJECTED;
                        await manager.save(other);

                        // Send Rejection Message
                        if (other.matchAnnouncementId) {
                            await this.sendSystemMessage(
                                manager,
                                other.matchAnnouncementId,
                                other.team,
                                `İşletme farklı bir kullanıcıyı kesinleştirdi. {{SAD}}\nBu saat için maç fırsatınızı kaçırdınız.\nFarklı saatlere göz atmaya ne dersiniz?\n\nEğer bir sorun olduğunu düşünüyorsanız lütfen işletme ile iletişime geçin.`,
                                { type: 'MATCH_REJECTED_PASSIVE', reservationId: other.id }
                            );

                            try {
                                const playersToNotify: any[] = [];
                                if (other.team?.players) playersToNotify.push(...other.team.players);

                                for (const player of playersToNotify) {
                                    await this.notificationsService.create({
                                        userId: player.id,
                                        type: 'SYSTEM',
                                        title: '❌ Maç Fırsatı Kaçtı',
                                        message: `İşletme farklı bir takımı kesinleştirdi. Bu saatteki rezervasyonunuz iptal oldu.`,
                                        relatedId: other.id,
                                        read: false,
                                        metadata: {
                                            type: 'MATCH_REJECTED_PASSIVE',
                                            reservationId: other.id
                                        }
                                    });
                                }
                            } catch (error) {
                                this.logger.error('Failed to send player rejection notifications:', error);
                            }
                        }
                    }
                }
            }

            return reservation;
        });
    }

    async revokeConfirmation(id: string) {
        this.logger.log(`Revoking confirmation for reservation: ${id}`);

        return this.dataSource.transaction(async (manager) => {
            const reservation = await manager.findOne(Reservation, {
                where: { id },
                relations: ['pitch', 'pitch.business', 'team', 'team.captain']
            });

            if (!reservation) {
                throw new Error('Reservation not found');
            }

            if (reservation.status !== ReservationStatus.APPROVED) {
                throw new Error('Sadece onaylanmış maçların onayı kaldırılabilir.');
            }

            // 1. Change status back to PENDING (Business Initiative)
            reservation.status = ReservationStatus.PENDING;
            reservation.cancelRequested = false;
            reservation.cancelRequestedByTeamId = null as unknown as string;
            await manager.save(reservation);

            // Clear related CANCEL_REQUEST notifications
            await manager.update(Notification,
                { type: 'CANCEL_REQUEST', relatedId: reservation.id },
                { read: true }
            );

            // 2. Notify the team
            if (reservation.matchAnnouncementId) {
                await this.sendSystemMessage(
                    manager,
                    reservation.matchAnnouncementId,
                    reservation.team,
                    `İşletme onayı kaldırdı. Rezervasyonunuz tekrar onay bekliyor durumuna döndü. {{REVOKE}}\nDiğer takımlarla birlikte değerlendirileceksiniz.`,
                    { type: 'MATCH_REVOKED_TO_PENDING', reservationId: reservation.id }
                );

                try {
                    const playersToNotify: any[] = [];
                    if (reservation.team?.players) playersToNotify.push(...reservation.team.players);
                    if (reservation.opponentTeam?.players) playersToNotify.push(...reservation.opponentTeam.players);

                    for (const player of playersToNotify) {
                        await this.notificationsService.create({
                            userId: player.id,
                            type: 'SYSTEM',
                            title: '⚠️ İşletme Onayı Kaldırdı',
                            message: `Kesinleşen maçınızın onayı işletme tarafından kaldırıldı. Rezervasyon tekrar 'Onay Bekliyor' durumuna döndü.`,
                            relatedId: reservation.id,
                            read: false,
                            metadata: {
                                type: 'MATCH_REVOKED_TO_PENDING',
                                reservationId: reservation.id
                            }
                        });
                    }
                } catch (error) {
                    this.logger.error('Failed to send player revoke notifications:', error);
                }
            }

            // 3. Find and restore conflicting REJECTED reservations
            const revocationTime = new Date(reservation.slotTime);
            const windowStart = new Date(revocationTime.getTime() - 15 * 60000); // -15 mins
            const windowEnd = new Date(revocationTime.getTime() + 15 * 60000);   // +15 mins

            const conflictingRejected = await manager.find(Reservation, {
                where: {
                    pitchId: reservation.pitchId,
                    status: ReservationStatus.REJECTED,
                    slotTime: Between(windowStart, windowEnd)
                },
                relations: ['team', 'team.captain']
            });

            if (conflictingRejected.length > 0) {
                this.logger.log(`Restoring ${conflictingRejected.length} rejected reservations to PENDING.`);
                for (const conflict of conflictingRejected) {
                    if (conflict.id !== id) {
                        conflict.status = ReservationStatus.PENDING;
                        await manager.save(conflict);

                        // Notify restored teams
                        if (conflict.matchAnnouncementId) {
                            await this.sendSystemMessage(
                                manager,
                                conflict.matchAnnouncementId,
                                conflict.team,
                                `Müjde! {{PARTY}}\nİşletme önceki onayı kaldırdı. Rezervasyonunuz tekrar aktif hale geldi ve onay bekliyor.\nŞansınız devam ediyor!`,
                                { type: 'MATCH_RESTORED_TO_PENDING', reservationId: conflict.id }
                            );

                            try {
                                const playersToNotify: any[] = [];
                                if (conflict.team?.players) playersToNotify.push(...conflict.team.players);

                                for (const player of playersToNotify) {
                                    await this.notificationsService.create({
                                        userId: player.id,
                                        type: 'SYSTEM',
                                        title: '🌟 Şansın Devam Ediyor!',
                                        message: `İşletme diğer takımın onayını kaldırdı. Reddedilen rezervasyonunuz tekrar "Onay Bekliyor" olarak güncellendi.`,
                                        relatedId: conflict.id,
                                        read: false,
                                        metadata: {
                                            type: 'MATCH_RESTORED_TO_PENDING',
                                            reservationId: conflict.id
                                        }
                                    });
                                }
                            } catch (error) {
                                this.logger.error('Failed to send player restore notifications:', error);
                            }
                        }
                    }
                }
            }

            return reservation;
        });
    }

    async sendBusinessNote(reservationId: string, note: string) {
        this.logger.log(`Sending business note for reservation: ${reservationId}`);

        const reservation = await this.reservationRepository.findOne({
            where: { id: reservationId },
            relations: ['team', 'team.captain', 'pitch', 'pitch.business']
        });

        if (!reservation) {
            throw new Error('Reservation not found');
        }

        if (!reservation.matchAnnouncementId) {
            throw new Error('This reservation is not linked to a match/chat.');
        }

        const businessName = reservation.pitch?.business?.name || 'İşletme';
        const messageContent = `{{COMMENT}} ${businessName} Mesajı:\n${note}`;

        await this.sendSystemMessage(
            this.dataSource.manager, // Use main manager since not in a transaction
            reservation.matchAnnouncementId,
            reservation.team,
            messageContent,
            { type: 'BUSINESS_NOTE', reservationId: reservation.id }
        );

        try {
            const playersToNotify: any[] = [];
            if (reservation.team?.players) playersToNotify.push(...reservation.team.players);
            if (reservation.opponentTeam?.players) playersToNotify.push(...reservation.opponentTeam.players);

            for (const player of playersToNotify) {
                await this.notificationsService.create({
                    userId: player.id,
                    type: 'SYSTEM',
                    title: `💬 İşletmeden Mesaj: ${businessName}`,
                    message: note,
                    relatedId: reservation.id,
                    read: false,
                    metadata: { type: 'BUSINESS_NOTE', reservationId: reservation.id }
                });
            }
        } catch (error) {
            this.logger.error('Failed to send player business note notifications:', error);
        }

        return { success: true };
    }

    // Helper to send system message with robust sender fallback and metadata
    private async sendSystemMessage(manager: any, matchId: string, team: any, content: string, metadata?: any) {
        try {
            // Find channel by relatedMatchId
            const channel = await manager.findOne(ChatChannel, {
                where: { relatedMatchId: matchId }
            });

            if (channel) {
                // FALLBACK SENDER LOGIC:
                // 1. Try Team Captain
                let senderId = (team?.captain as any)?.id || team?.captainId;

                // 2. If no captain, find ANY participant in this channel
                if (!senderId) {
                    const participants = await manager.query(
                        `SELECT "userId" FROM chat_participants_v2 WHERE "channelId" = $1 LIMIT 1`,
                        [channel.id]
                    );
                    if (participants && participants.length > 0) {
                        senderId = participants[0].userId;
                    }
                }

                if (senderId) {
                    await this.chatService.sendMessage(
                        channel.id,
                        senderId,
                        content,
                        true, // isSystemMessage
                        metadata // Pass metadata
                    );
                    this.logger.log(`System message sent to channel ${channel.id}`);
                } else {
                    this.logger.warn(`⚠️ Cannot send system message: No valid sender found for channel ${channel.id}`);
                }
            } else {
                this.logger.warn(`⚠️ Cannot send system message: Channel not found for matchId ${matchId}`);
            }
        } catch (error) {
            this.logger.error('Failed to send system message:', error);
        }
    }

    async findByTeam(teamId: string) {
        return this.reservationRepository.find({
            where: { team: { id: teamId } },
            relations: ['pitch', 'pitch.business', 'team', 'opponentTeam'],
            order: { slotTime: 'ASC' }
        });
    }

    async findUpcomingByTeam(teamId: string) {
        const now = new Date();
        return this.reservationRepository.createQueryBuilder('reservation')
            .leftJoinAndSelect('reservation.pitch', 'pitch')
            .leftJoinAndSelect('pitch.business', 'business')
            .leftJoinAndSelect('reservation.team', 'team')
            .leftJoinAndSelect('reservation.opponentTeam', 'opponentTeam')
            .where('reservation.status = :status', { status: ReservationStatus.APPROVED })
            .andWhere('reservation.slotTime >= :now', { now })
            .andWhere('(reservation.teamId = :teamId OR reservation.opponentTeamId = :teamId)', { teamId })
            .orderBy('reservation.slotTime', 'ASC')
            .getMany();
    }

    async cancel(id: string, teamId: string) {
        const reservation = await this.reservationRepository.findOne({
            where: { id, team: { id: teamId } },
            relations: ['team', 'team.captain', 'pitch', 'pitch.business', 'matchAnnouncement']
        });

        if (!reservation) {
            throw new Error('Reservation not found or unauthorized');
        }

        // Allow cancelling APPROVED as well now (Captain cancellation)
        if (reservation.status !== ReservationStatus.PENDING &&
            reservation.status !== ReservationStatus.REJECTED &&
            reservation.status !== ReservationStatus.APPROVED) {
            throw new Error('Bu rezervasyon iptal edilemez.');
        }

        reservation.status = ReservationStatus.CANCELLED;
        await this.reservationRepository.save(reservation);

        // Notify chat if it was an approved match and update announcement status
        if (reservation.matchAnnouncement) {
            await this.matchAnnouncementRepository.update(
                reservation.matchAnnouncement.id,
                { status: 'CANCELLED' }
            );

            const slotTime = new Date(reservation.slotTime);
            const dateStr = slotTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
            const timeStr = slotTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            const endTimeStr = new Date(slotTime.getTime() + 60 * 60 * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            const businessName = reservation.pitch?.business?.name || 'İşletme';
            const pitchName = reservation.pitch?.name || 'Saha';

            await this.sendSystemMessage(
                this.dataSource.manager,
                reservation.matchAnnouncement.id,
                reservation.team, // Sender context (Captain)
                `Takım kaptanı maçı iptal etti. {{CANCEL}}\n\n` +
                `{{STADIUM}} ${businessName}\n` +
                `{{PIN}} ${pitchName}\n` +
                `{{CALENDAR}} ${dateStr}\n` +
                `{{CLOCK}} ${timeStr} - ${endTimeStr}`,
                { type: 'MATCH_CANCELLED_BY_CAPTAIN', reservationId: reservation.id }
            );

            try {
                const playersToNotify: any[] = [];
                // Only notify if there are players loaded. In cancel(), relations 'team' and 'team.captain' were loaded.
                // We might not have players loaded, but that's okay, they will see it in the chat. 
                // We'll query participants via chat service for robust notification delivery later, or load players here:
                const resWithPlayers = await this.reservationRepository.findOne({
                    where: { id: reservation.id },
                    relations: ['team', 'team.players', 'opponentTeam', 'opponentTeam.players']
                });

                if (resWithPlayers?.team?.players) playersToNotify.push(...resWithPlayers.team.players);
                if (resWithPlayers?.opponentTeam?.players) playersToNotify.push(...resWithPlayers.opponentTeam.players);

                for (const player of playersToNotify) {
                    await this.notificationsService.create({
                        userId: player.id,
                        type: 'SYSTEM',
                        title: '🚫 Maç İptal Edildi',
                        message: `${businessName} - ${pitchName}\n${dateStr} ${timeStr}\n\nTakım kaptanı maçı iptal etti.`,
                        relatedId: reservation.id,
                        read: false,
                        metadata: { type: 'MATCH_CANCELLED_BY_CAPTAIN', reservationId: reservation.id }
                    });
                }
            } catch (error) {
                this.logger.error('Failed to send player cancellation notifications:', error);
            }
        }

        return reservation;
    }
    async requestCancel(id: string, teamId: string, userId: string) {
        const reservation = await this.reservationRepository.findOne({
            where: { id, team: { id: teamId } },
            relations: ['team', 'pitch', 'pitch.business']
        });

        if (!reservation) {
            throw new Error('Reservation not found or unauthorized');
        }

        if (reservation.status !== ReservationStatus.APPROVED) {
            throw new Error('Sadece onaylanmış maçlar için iptal isteği gönderilebilir.');
        }

        if (reservation.cancelRequested) {
            throw new Error('Zaten bir iptal isteği gönderilmiş.');
        }

        // Update reservation
        reservation.cancelRequested = true;
        reservation.cancelRequestedByTeamId = teamId;
        await this.reservationRepository.save(reservation);

        // Notify chat
        if (reservation.matchAnnouncementId) {
            const slotTime = new Date(reservation.slotTime);
            const dateStr = slotTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
            const timeStr = slotTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            const endTimeStr = new Date(slotTime.getTime() + 60 * 60 * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            const businessName = reservation.pitch?.business?.name || 'İşletme';
            const pitchName = reservation.pitch?.name || 'Saha';

            // Fetch user name
            const requestingUser = await this.userRepository.findOne({ where: { id: userId } });
            const userName = requestingUser?.full_name || 'Bir kullanıcı';

            await this.sendSystemMessage(
                this.dataSource.manager,
                reservation.matchAnnouncementId,
                reservation.team,
                `${userName} maç iptal etme isteği gönderdi. Hızlandırmak için işletmeyle iletişime geçebilirsiniz.\n\n` +
                `{{STADIUM}} ${businessName}\n` +
                `{{PIN}} ${pitchName}\n` +
                `{{CALENDAR}} ${dateStr}\n` +
                `{{CLOCK}} ${timeStr} - ${endTimeStr}`,
                { type: 'CANCEL_REQUEST_SENT', reservationId: reservation.id }
            );
        }

        // Notify Business Owner
        try {
            if (reservation.pitch?.business) {
                const owner = await this.businessOwnerRepository.findOne({
                    where: { business: { id: reservation.pitch.business.id } }
                });

                if (owner) {
                    const slotTime = new Date(reservation.slotTime);
                    const dateStr = slotTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
                    const timeStr = slotTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                    await this.notificationsService.create({
                        userId: owner.id,
                        type: 'CANCEL_REQUEST',
                        title: 'Talebe Dikkat: Maç İptal İsteği!',
                        message: `${reservation.pitch.name} için ${dateStr} saat ${timeStr} dilimindeki maç takımı tarafından iptal edilmek isteniyor.`,
                        relatedId: reservation.id,
                        read: false,
                        metadata: {
                            reservationId: reservation.id,
                            pitchName: reservation.pitch.name,
                            date: dateStr,
                            time: timeStr,
                            role: 'BUSINESS_OWNER'
                        }
                    });
                }
            }
        } catch (error) {
            this.logger.error('Failed to send business owner cancel request notification', error);
        }

        return reservation;
    }

    async undoCancelRequest(id: string, teamId: string, userId: string) {
        const reservation = await this.reservationRepository.findOne({
            where: { id, team: { id: teamId } },
            relations: ['team', 'pitch', 'pitch.business']
        });

        if (!reservation) {
            throw new Error('Reservation not found or unauthorized');
        }

        if (!reservation.cancelRequested) {
            throw new Error('İptal isteği bulunmuyor.');
        }

        // Revert cancelRequested
        reservation.cancelRequested = false;
        reservation.cancelRequestedByTeamId = null as unknown as string;
        await this.reservationRepository.save(reservation);

        // Clear related CANCEL_REQUEST notifications
        await this.dataSource.manager.update(Notification,
            { type: 'CANCEL_REQUEST', relatedId: reservation.id },
            { read: true }
        );

        // Fetch user name
        const requestingUser = await this.userRepository.findOne({ where: { id: userId } });
        const userName = requestingUser?.full_name || 'Bir kullanıcı';

        // Notify chat
        if (reservation.matchAnnouncementId) {
            const slotTime = new Date(reservation.slotTime);
            const dateStr = slotTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
            const timeStr = slotTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            const endTimeStr = new Date(slotTime.getTime() + 60 * 60 * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            const businessName = reservation.pitch?.business?.name || 'İşletme';
            const pitchName = reservation.pitch?.name || 'Saha';

            await this.sendSystemMessage(
                this.dataSource.manager,
                reservation.matchAnnouncementId,
                reservation.team,
                `${userName} iptal isteğini geri aldı. Maçınız planlandığı gibi devam edecektir. \n\n` +
                `{{STADIUM}} ${businessName}\n` +
                `{{PIN}} ${pitchName}\n` +
                `{{CALENDAR}} ${dateStr}\n` +
                `{{CLOCK}} ${timeStr} - ${endTimeStr}`,
                { type: 'UNDO_CANCEL_REQUEST', reservationId: reservation.id }
            );
        }

        // Notify Business Owner
        try {
            if (reservation.pitch?.business) {
                const owner = await this.businessOwnerRepository.findOne({
                    where: { business: { id: reservation.pitch.business.id } }
                });

                if (owner) {
                    const slotTime = new Date(reservation.slotTime);
                    const dateStr = slotTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
                    const timeStr = slotTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                    await this.notificationsService.create({
                        userId: owner.id,
                        type: 'CANCEL_REQUEST_UNDONE',
                        title: 'İptal İsteği Geri Alındı',
                        message: `${reservation.pitch.name} için ${dateStr} saat ${timeStr} dilimindeki maçın iptal isteği takım tarafından geri çekildi. Maç devam ediyor.`,
                        relatedId: reservation.id,
                        read: false,
                        metadata: {
                            reservationId: reservation.id,
                            pitchName: reservation.pitch.name,
                            date: dateStr,
                            time: timeStr,
                            role: 'BUSINESS_OWNER'
                        }
                    });
                }
            }
        } catch (error) {
            this.logger.error('Failed to send business owner cancel request undone notification', error);
        }

        return reservation;
    }

    async acceptCancelRequest(id: string) {
        this.logger.log(`Accepting cancel request for reservation: ${id}`);

        return this.dataSource.transaction(async (manager) => {
            const reservation = await manager.findOne(Reservation, {
                where: { id, cancelRequested: true },
                relations: ['team', 'team.players', 'opponentTeam', 'opponentTeam.players', 'pitch', 'pitch.business', 'matchAnnouncement']
            });

            if (!reservation) {
                throw new Error('Reservation not found or no active cancel request.');
            }

            reservation.status = ReservationStatus.CANCELLED;
            reservation.cancelRequested = false;
            await manager.save(reservation);

            // Clear related CANCEL_REQUEST notifications
            await manager.update(Notification,
                { type: 'CANCEL_REQUEST', relatedId: reservation.id },
                { read: true }
            );

            // Notify chat and update Announcement status
            if (reservation.matchAnnouncement) {
                await manager.update(MatchAnnouncement, reservation.matchAnnouncement.id, { status: 'CANCELLED' });

                const slotTime = new Date(reservation.slotTime);
                const dateStr = slotTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
                const timeStr = slotTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                const endTimeStr = new Date(slotTime.getTime() + 60 * 60 * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                const businessName = reservation.pitch?.business?.name || 'İşletme';
                const pitchName = reservation.pitch?.name || 'Saha';

                await this.sendSystemMessage(
                    manager,
                    reservation.matchAnnouncement.id,
                    reservation.team,
                    `İşletme iptal isteğini onayladı. Maç iptal edildi. {{CANCEL}}\n\n` +
                    `{{STADIUM}} ${businessName}\n` +
                    `{{PIN}} ${pitchName}\n` +
                    `{{CALENDAR}} ${dateStr}\n` +
                    `{{CLOCK}} ${timeStr} - ${endTimeStr}`,
                    { type: 'MATCH_CANCELLED_BY_BUSINESS_APPROVAL', reservationId: reservation.id }
                );

                try {
                    const playersToNotify: any[] = [];
                    if (reservation.team?.players) playersToNotify.push(...reservation.team.players);
                    if (reservation.opponentTeam?.players) playersToNotify.push(...reservation.opponentTeam.players);

                    for (const player of playersToNotify) {
                        await this.notificationsService.create({
                            userId: player.id,
                            type: 'SYSTEM',
                            title: '🚫 Maç İptal Edildi',
                            message: `${businessName} - ${pitchName}\n${dateStr} ${timeStr}\n\nİşletme iptal isteğini onayladı.`,
                            relatedId: reservation.id,
                            read: false,
                            metadata: { type: 'MATCH_CANCELLED_BY_BUSINESS_APPROVAL', reservationId: reservation.id }
                        });
                    }
                } catch (error) {
                    this.logger.error('Failed to send player cancellation notifications:', error);
                }
            }

            return reservation;
        });
    }

    async rejectCancelRequest(id: string) {
        this.logger.log(`Rejecting cancel request for reservation: ${id}`);

        return this.dataSource.transaction(async (manager) => {
            const reservation = await manager.findOne(Reservation, {
                where: { id, cancelRequested: true },
                relations: ['team', 'pitch', 'pitch.business']
            });

            if (!reservation) {
                throw new Error('Reservation not found or no active cancel request.');
            }

            reservation.cancelRequested = false;
            await manager.save(reservation);

            // Clear related CANCEL_REQUEST notifications
            await manager.update(Notification,
                { type: 'CANCEL_REQUEST', relatedId: reservation.id },
                { read: true }
            );

            // Notify chat
            if (reservation.matchAnnouncementId) {
                const slotTime = new Date(reservation.slotTime);
                const dateStr = slotTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
                const timeStr = slotTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                const endTimeStr = new Date(slotTime.getTime() + 60 * 60 * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                const businessName = reservation.pitch?.business?.name || 'İşletme';
                const pitchName = reservation.pitch?.name || 'Saha';

                await this.sendSystemMessage(
                    manager,
                    reservation.matchAnnouncementId,
                    reservation.team,
                    `İşletme iptal talebini reddetti. İşletme ile iletişime geçmenizi öneririz.\n\n` +
                    `{{STADIUM}} ${businessName}\n` +
                    `{{PIN}} ${pitchName}\n` +
                    `{{CALENDAR}} ${dateStr}\n` +
                    `{{CLOCK}} ${timeStr} - ${endTimeStr}`,
                    { type: 'CANCEL_REQUEST_REJECTED', reservationId: reservation.id }
                );
            }

            return reservation;
        });
    }

    async findByPitchAndDateRange(pitchId: string, date: string) {
        // date format: YYYY-MM-DD
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return this.reservationRepository.createQueryBuilder('reservation')
            .leftJoinAndSelect('reservation.pitch', 'pitch')
            .leftJoinAndSelect('reservation.team', 'team')
            .leftJoinAndSelect('reservation.opponentTeam', 'opponentTeam')
            .where('reservation.pitchId = :pitchId', { pitchId })
            .andWhere('reservation.slotTime >= :start', { start: startOfDay })
            .andWhere('reservation.slotTime <= :end', { end: endOfDay })
            .orderBy('reservation.slotTime', 'ASC')
            .getMany();
    }

    async proposeTime(id: string, userId: string, newSlotTime: Date) {
        const reservation = await this.reservationRepository.findOne({
            where: { id },
            relations: ['team', 'team.captain', 'opponentTeam', 'opponentTeam.captain']
        });

        if (!reservation) throw new Error('Reservation not found');

        // Verify User is Captain of one of the teams
        const isTeamCaptain = (reservation.team?.captain as any)?.id === userId || reservation.team?.captainId === userId;
        const isOpponentCaptain = (reservation.opponentTeam?.captain as any)?.id === userId || reservation.opponentTeam?.captainId === userId;

        if (!isTeamCaptain && !isOpponentCaptain) {
            throw new Error('Only captains can propose a time change.');
        }

        reservation.proposedTime = newSlotTime;
        reservation.proposedByUserId = userId;
        await this.reservationRepository.save(reservation);

        // Send System Message
        if (reservation.matchAnnouncementId) {
            const dateStr = new Date(newSlotTime).toLocaleString('tr-TR');
            const proposerName = isTeamCaptain ? reservation.team.name : reservation.opponentTeam.name;

            await this.sendSystemMessage(
                this.dataSource.manager,
                reservation.matchAnnouncementId,
                reservation.team, // Context team
                `{{PROPOSAL}} YENİ SAAT TEKLİFİ\n\n${proposerName} kaptanı yeni bir saat önerdi:\n{{CALENDAR}} ${dateStr}\n\nKabul etmek için aşağıdaki butona tıklayın.`,
                { type: 'PROPOSAL_ACTION', reservationId: reservation.id, proposedTime: newSlotTime }
            );

            try {
                // Notify the other team's captain
                const targetCaptainId = isTeamCaptain
                    ? (reservation.opponentTeam?.captainId || (reservation.opponentTeam?.captain as any)?.id)
                    : (reservation.team?.captainId || (reservation.team?.captain as any)?.id);

                if (targetCaptainId) {
                    await this.notificationsService.create({
                        userId: targetCaptainId,
                        type: 'SYSTEM',
                        title: '🕒 Yeni Saat Teklifi',
                        message: `${proposerName} kaptanı yeni bir saat önerdi: ${dateStr}`,
                        relatedId: reservation.id,
                        read: false,
                        metadata: { type: 'PROPOSAL_ACTION', reservationId: reservation.id, proposedTime: newSlotTime }
                    });
                }
            } catch (error) {
                this.logger.error('Failed to send proposal notification:', error);
            }
        }

        return reservation;
    }

    async acceptProposal(id: string, userId: string) {
        return this.dataSource.transaction(async (manager) => {
            const reservation = await manager.findOne(Reservation, {
                where: { id },
                relations: ['team', 'team.captain', 'opponentTeam', 'opponentTeam.captain']
            });

            if (!reservation) throw new Error('Reservation not found');
            if (!reservation.proposedTime) throw new Error('No time proposed.');

            // Verify User is the OTHER captain
            const proposerId = reservation.proposedByUserId;

            const isTeamCaptain = (reservation.team?.captain as any)?.id === userId || reservation.team?.captainId === userId;
            const isOpponentCaptain = (reservation.opponentTeam?.captain as any)?.id === userId || reservation.opponentTeam?.captainId === userId;

            if (!isTeamCaptain && !isOpponentCaptain) throw new Error('Not authorized.');
            if (userId === proposerId) throw new Error('You cannot accept your own proposal.');

            // CHECK AVAILABILITY of proposed time
            const approvalTime = new Date(reservation.proposedTime);
            const windowStart = new Date(approvalTime.getTime() - 15 * 60000);
            const windowEnd = new Date(approvalTime.getTime() + 15 * 60000);

            const existingApproved = await manager.findOne(Reservation, {
                where: {
                    pitchId: reservation.pitchId,
                    status: ReservationStatus.APPROVED,
                    slotTime: Between(windowStart, windowEnd)
                }
            });

            if (existingApproved) {
                throw new Error('Önerilen saat maalesef dolu. Lütfen başka bir saat deneyin.');
            }

            // Apply Change
            reservation.slotTime = reservation.proposedTime;
            reservation.status = ReservationStatus.PENDING; // Back to pending for Business consideration
            reservation.proposedTime = null as any; // Clear proposal
            await manager.save(reservation);

            // Notify
            if (reservation.matchAnnouncementId) {
                const dateStr = approvalTime.toLocaleString('tr-TR');
                await this.sendSystemMessage(
                    manager,
                    reservation.matchAnnouncementId,
                    reservation.team,
                    `{{HANDSHAKE}} ANLAŞMA SAĞLANDI!\n\nMaç saati ${dateStr} olarak güncellendi.\nİşletme onayı bekleniyor...`,
                    { type: 'INFO', reservationId: reservation.id }
                );
            }

            return reservation;
        });
    }
}
