import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationQueryService } from './services/reservation-query.service';
import { ReservationLifecycleService } from './services/reservation-lifecycle.service';
import { ReservationProposalService } from './services/reservation-proposal.service';
import { ReservationRecurringService } from './services/reservation-recurring.service';

/**
 * Reservations facade — public API'yi birebir imzayla korur, mantık cohesive alt-servislere
 * delege eder (query / lifecycle / proposal / recurring; ortak yardımcılar Support servisinde).
 * Controller + dış çağıranlar (business-owner, match-announcements, challenges, chat) DEĞİŞMEZ.
 * ⚠️ @Cron metotları (checkMatchReminders → Lifecycle, topUpRecurringClosures → Recurring) ilgili
 * alt-servislerde tanımlıdır; burada YOK (çift-fire önlenir). Alt-servisler: reservations/services/*.
 */
@Injectable()
export class ReservationsService {
  constructor(
    private readonly query: ReservationQueryService,
    private readonly lifecycle: ReservationLifecycleService,
    private readonly proposal: ReservationProposalService,
    private readonly recurring: ReservationRecurringService,
  ) {}

  // ─── Sürekli kapatma / manuel doldurma (Recurring) ──────────────────────────

  manualFill(pitchId: string, ownerId: string, slotTime: Date) {
    return this.recurring.manualFill(pitchId, ownerId, slotTime);
  }

  createRecurringClosure(
    pitchId: string,
    ownerId: string,
    slotTime: Date,
    startTime: string,
    endTime: string,
  ) {
    return this.recurring.createRecurringClosure(
      pitchId,
      ownerId,
      slotTime,
      startTime,
      endTime,
    );
  }

  findRecurringClosuresByPitch(pitchId: string, ownerId: string) {
    return this.recurring.findRecurringClosuresByPitch(pitchId, ownerId);
  }

  removeRecurringClosure(id: string, ownerId: string) {
    return this.recurring.removeRecurringClosure(id, ownerId);
  }

  // ─── Yaşam döngüsü (Lifecycle) ──────────────────────────────────────────────

  assertSlotAvailable(pitchId: string, slotTime: Date) {
    return this.lifecycle.assertSlotAvailable(pitchId, slotTime);
  }

  create(createReservationDto: CreateReservationDto) {
    return this.lifecycle.create(createReservationDto);
  }

  approve(id: string, ownerId: string, businessNote?: string) {
    return this.lifecycle.approve(id, ownerId, businessNote);
  }

  revokeConfirmation(id: string, ownerId: string) {
    return this.lifecycle.revokeConfirmation(id, ownerId);
  }

  cancel(id: string, userId: string) {
    return this.lifecycle.cancel(id, userId);
  }

  requestCancel(id: string, userId: string) {
    return this.lifecycle.requestCancel(id, userId);
  }

  undoCancelRequest(id: string, userId: string) {
    return this.lifecycle.undoCancelRequest(id, userId);
  }

  acceptCancelRequest(id: string, ownerId: string) {
    return this.lifecycle.acceptCancelRequest(id, ownerId);
  }

  rejectCancelRequest(id: string, ownerId: string) {
    return this.lifecycle.rejectCancelRequest(id, ownerId);
  }

  rejectByBusiness(reservationId: string, ownerId: string) {
    return this.lifecycle.rejectByBusiness(reservationId, ownerId);
  }

  sendBusinessNote(reservationId: string, ownerId: string, note: string) {
    return this.lifecycle.sendBusinessNote(reservationId, ownerId, note);
  }

  cancelPendingForPitches(
    pitchIds: string[],
    ctx: {
      scope: 'BUSINESS_CLOSED' | 'PITCH_REMOVED' | 'PITCH_SCHEDULED_OFFLINE';
      businessName: string;
      pitchNameById?: Map<string, string>;
      fromTime?: Date;
    },
    manager: EntityManager,
  ) {
    return this.lifecycle.cancelPendingForPitches(pitchIds, ctx, manager);
  }

  // ─── Saat teklifi (Proposal) ────────────────────────────────────────────────

  proposeTime(id: string, userId: string, newSlotTime: Date) {
    return this.proposal.proposeTime(id, userId, newSlotTime);
  }

  acceptProposal(id: string, userId: string) {
    return this.proposal.acceptProposal(id, userId);
  }

  // ─── Sorgular (Query) ───────────────────────────────────────────────────────

  findAll() {
    return this.query.findAll();
  }

  findByPitchAndDate(pitchId: string, start: Date, end: Date) {
    return this.query.findByPitchAndDate(pitchId, start, end);
  }

  findPendingBySlot(pitchId: string, slotTime: Date) {
    return this.query.findPendingBySlot(pitchId, slotTime);
  }

  findByTeam(teamId: string) {
    return this.query.findByTeam(teamId);
  }

  findUpcomingByTeam(teamId: string) {
    return this.query.findUpcomingByTeam(teamId);
  }

  // GÜVENLİK: /reservations/upcoming ucu için — takım query'den DEĞİL token
  // kullanıcısından türetilir (IDOR kapalı). Takımsız kullanıcı → boş liste.
  async findUpcomingForUser(userId: string) {
    const teamId = await this.lifecycle
      .resolveUserTeamId(userId)
      .catch(() => null);
    if (!teamId) return [];
    return this.query.findUpcomingByTeam(teamId);
  }

  findByPitchAndDateRange(pitchId: string, date: string) {
    return this.query.findByPitchAndDateRange(pitchId, date);
  }

  hasConflictingApprovedMatch(teamId: string, announcementStart: Date) {
    return this.query.hasConflictingApprovedMatch(teamId, announcementStart);
  }
}
