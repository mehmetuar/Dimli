import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, Repository } from 'typeorm';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { ReservationSupportService } from './reservation-support.service';

// Saat değişikliği teklifi akışı (kaptanlar arası). sendSystemMessage için Support kullanır;
// acceptProposal transaction'ı bu servis içinde korunur.
@Injectable()
export class ReservationProposalService {
  private readonly logger = new Logger(ReservationProposalService.name);

  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
    private support: ReservationSupportService,
  ) {}

  async proposeTime(id: string, userId: string, newSlotTime: Date) {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: [
        'team',
        'team.captain',
        'opponentTeam',
        'opponentTeam.captain',
      ],
    });

    if (!reservation) throw new Error('Reservation not found');

    // Verify User is Captain of one of the teams
    const isTeamCaptain =
      reservation.team?.captain?.id === userId ||
      reservation.team?.captainId === userId;
    const isOpponentCaptain =
      reservation.opponentTeam?.captain?.id === userId ||
      reservation.opponentTeam?.captainId === userId;

    if (!isTeamCaptain && !isOpponentCaptain) {
      throw new Error('Only captains can propose a time change.');
    }

    reservation.proposedTime = newSlotTime;
    reservation.proposedByUserId = userId;
    await this.reservationRepository.save(reservation);

    // Send System Message
    if (reservation.matchAnnouncementId) {
      const dateStr = new Date(newSlotTime).toLocaleString('tr-TR');
      const proposerName = isTeamCaptain
        ? reservation.team.name
        : reservation.opponentTeam.name;

      await this.support.sendSystemMessage(
        this.dataSource.manager,
        reservation.matchAnnouncementId,
        reservation.team, // Context team
        `{{PROPOSAL}} YENİ SAAT TEKLİFİ\n\n${proposerName} kaptanı yeni bir saat önerdi:\n{{CALENDAR}} ${dateStr}\n\nKabul etmek için aşağıdaki butona tıklayın.`,
        {
          type: 'PROPOSAL_ACTION',
          reservationId: reservation.id,
          proposedTime: newSlotTime,
        },
      );

      try {
        // Notify the other team's captain
        const targetCaptainId = isTeamCaptain
          ? reservation.opponentTeam?.captainId ||
            reservation.opponentTeam?.captain?.id
          : reservation.team?.captainId || reservation.team?.captain?.id;

        if (targetCaptainId) {
          await this.notificationsService.create({
            userId: targetCaptainId,
            type: 'SYSTEM',
            title: 'Yeni Saat Teklifi',
            message: `${proposerName} kaptanı yeni bir saat önerdi: ${dateStr}`,
            relatedId: reservation.id,
            read: false,
            metadata: {
              type: 'PROPOSAL_ACTION',
              reservationId: reservation.id,
              proposedTime: newSlotTime,
            },
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
        relations: [
          'team',
          'team.captain',
          'opponentTeam',
          'opponentTeam.captain',
        ],
      });

      if (!reservation) throw new Error('Reservation not found');
      if (!reservation.proposedTime) throw new Error('No time proposed.');

      // Verify User is the OTHER captain
      const proposerId = reservation.proposedByUserId;

      const isTeamCaptain =
        reservation.team?.captain?.id === userId ||
        reservation.team?.captainId === userId;
      const isOpponentCaptain =
        reservation.opponentTeam?.captain?.id === userId ||
        reservation.opponentTeam?.captainId === userId;

      if (!isTeamCaptain && !isOpponentCaptain)
        throw new Error('Not authorized.');
      if (userId === proposerId)
        throw new Error('You cannot accept your own proposal.');

      // CHECK AVAILABILITY of proposed time
      const approvalTime = new Date(reservation.proposedTime);
      const windowStart = new Date(approvalTime.getTime() - 15 * 60000);
      const windowEnd = new Date(approvalTime.getTime() + 15 * 60000);

      const existingApproved = await manager.findOne(Reservation, {
        where: {
          pitchId: reservation.pitchId,
          status: ReservationStatus.APPROVED,
          slotTime: Between(windowStart, windowEnd),
        },
      });

      if (existingApproved) {
        throw new Error(
          'Önerilen saat maalesef dolu. Lütfen başka bir saat deneyin.',
        );
      }

      // Apply Change
      reservation.slotTime = reservation.proposedTime;
      reservation.status = ReservationStatus.PENDING; // Back to pending for Business consideration
      reservation.proposedTime = null as unknown as Date; // Clear proposal
      await manager.save(reservation);

      // Notify
      if (reservation.matchAnnouncementId) {
        const dateStr = approvalTime.toLocaleString('tr-TR');
        await this.support.sendSystemMessage(
          manager,
          reservation.matchAnnouncementId,
          reservation.team,
          `{{HANDSHAKE}} ANLAŞMA SAĞLANDI!\n\nMaç saati ${dateStr} olarak güncellendi.\nİşletme onayı bekleniyor...`,
          { type: 'INFO', reservationId: reservation.id },
        );
      }

      return reservation;
    });
  }
}
