import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In, LessThan, MoreThan, Between } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { ChatService } from '../chat/chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatChannel } from '../chat/chat-channel.entity';

@Injectable()
export class ReservationsService {
    private readonly logger = new Logger(ReservationsService.name);

    constructor(
        @InjectRepository(Reservation)
        private reservationRepository: Repository<Reservation>,
        private chatService: ChatService,
        private notificationsService: NotificationsService,
        @InjectRepository(ChatChannel)
        private chatChannelRepository: Repository<ChatChannel>,
        private dataSource: DataSource
    ) { }

    async create(createReservationDto: any) {
        const reservation = this.reservationRepository.create(createReservationDto);
        return this.reservationRepository.save(reservation);
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

            // 4. PREPARE AND SEND SYSTEM MESSAGE
            if (reservation.matchAnnouncementId) {
                // Determine Business Name and Pitch Name
                const businessName = reservation.pitch?.business?.name || 'İşletme';
                const pitchName = reservation.pitch?.name || 'Saha';

                // Format Date and Time
                const dateStr = approvalTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
                const timeStr = approvalTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                // Construct Message
                let messageContent = `Tebrikler işletme sahibi maçınızı kesinleştirdi. 👏\n\n` +
                    `📅 ${dateStr} tarihinde\n` +
                    `🏟️ ${businessName} işletmesinin ${pitchName} nolu sahasında\n` +
                    `🕗 Saat ${timeStr} için iyi oyunlar!`;

                // Add Business Note if exists
                if (businessNote && businessNote.trim() !== '') {
                    messageContent += `\n\n💬 **İşletme Mesajı:**\n${businessNote}`;
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

            // 5. Reject others for the same slot
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
                                `Bu saat için eşleşme şansını kaçırdınız. 😔\n(İşletme başka bir takımı onayladı)`,
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

    async cancel(id: string, teamId: string) {
        const reservation = await this.reservationRepository.findOne({
            where: { id, team: { id: teamId } },
            relations: ['team']
        });

        if (!reservation) {
            throw new Error('Reservation not found or unauthorized');
        }

        if (reservation.status !== ReservationStatus.PENDING && reservation.status !== ReservationStatus.REJECTED) {
            throw new Error('Only pending or rejected reservations can be cancelled');
        }

        reservation.status = ReservationStatus.CANCELLED;
        await this.reservationRepository.save(reservation);
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
