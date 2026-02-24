import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In, LessThan, MoreThan, Between, MoreThanOrEqual } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { ChatService } from '../chat/chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatChannel } from '../chat/chat-channel.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Pitch } from '../pitches/entities/pitch.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';

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
                relations: ['pitch', 'pitch.business', 'team', 'team.captain', 'opponentTeam']
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

                // Format Date and Time
                const dateStr = approvalTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
                const timeStr = approvalTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                // Construct Message - CLEAN & EMOJI-FREE (except ball)
                let messageContent = `Maçınız kesinleşti! ⚽\n\n` +
                    `Tarih: ${dateStr}\n` +
                    `Saat: ${timeStr}\n` +
                    `Saha: ${pitchName}`;

                // Add Business Note if exists
                if (businessNote && businessNote.trim() !== '') {
                    messageContent += `\n\n💬 **İşletme Notu:**\n${businessNote}`;
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
                                `İşletme farklı bir kullanıcıyı kesinleştirdi. 😔\nBu saat için maç fırsatınızı kaçırdınız.\nFarklı saatlere göz atmaya ne dersiniz?`,
                                { type: 'MATCH_REJECTED_PASSIVE', reservationId: other.id }
                            );
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
            await manager.save(reservation);

            // 2. Notify the team
            if (reservation.matchAnnouncementId) {
                await this.sendSystemMessage(
                    manager,
                    reservation.matchAnnouncementId,
                    reservation.team,
                    `İşletme onayı kaldırdı. Rezervasyonunuz tekrar onay bekliyor durumuna döndü. 🔄\nDiğer takımlarla birlikte değerlendirileceksiniz.`,
                    { type: 'MATCH_REVOKED_TO_PENDING', reservationId: reservation.id }
                );
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
                                `Müjde! 🎉\nİşletme önceki onayı kaldırdı. Rezervasyonunuz tekrar aktif hale geldi ve onay bekliyor.\nŞansınız devam ediyor!`,
                                { type: 'MATCH_RESTORED_TO_PENDING', reservationId: conflict.id }
                            );
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
        const messageContent = `💬 **${businessName} Mesajı:**\n${note}`;

        await this.sendSystemMessage(
            this.dataSource.manager, // Use main manager since not in a transaction
            reservation.matchAnnouncementId,
            reservation.team,
            messageContent,
            { type: 'BUSINESS_NOTE', reservationId: reservation.id }
        );

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
            relations: ['team', 'team.captain']
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

        // Notify chat if it was an approved match
        if (reservation.matchAnnouncementId) {
            await this.sendSystemMessage(
                this.dataSource.manager,
                reservation.matchAnnouncementId,
                reservation.team, // Sender context (Captain)
                `Takım kaptanı maçı iptal etti. ❌`,
                { type: 'MATCH_CANCELLED_BY_CAPTAIN', reservationId: reservation.id }
            );
        }

        return reservation;
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
                `⏱️ YENİ SAAT TEKLİFİ\n\n${proposerName} kaptanı yeni bir saat önerdi:\n📅 ${dateStr}\n\nKabul etmek için aşağıdaki butona tıklayın.`,
                { type: 'PROPOSAL_ACTION', reservationId: reservation.id, proposedTime: newSlotTime }
            );
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
                    `🤝 ANLAŞMA SAĞLANDI!\n\nMaç saati ${dateStr} olarak güncellendi.\nİşletme onayı bekleniyor... ⏳`,
                    { type: 'INFO', reservationId: reservation.id }
                );
            }

            return reservation;
        });
    }
}
