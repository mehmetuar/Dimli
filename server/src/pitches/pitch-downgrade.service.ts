import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Between,
  DataSource,
  EntityManager,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import { Pitch } from './entities/pitch.entity';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';
import { RecurringClosure } from '../reservations/entities/recurring-closure.entity';
import { Subscription } from '../subscription/entities/subscription.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { ReservationsService } from '../reservations/reservations.service';
import {
  SubscriptionService,
  SUBSCRIPTION_PLANS,
} from '../subscription/subscription.service';
import { NotificationsService } from '../notifications/notifications.service';
import { istanbulDisplayParts } from '../common/turkey-time.util';

// Hatırlatma bildirimi silinmeden ne kadar önce gönderilir.
const REMINDER_WINDOW_MS = 72 * 60 * 60 * 1000; // 3 gün

/**
 * Plan düşürmede saha silmenin FATURA DÖNEMİ SONUNA (X) ertelenmesi:
 *  - precheck: satın alma başlamadan salt-okunur doğrulama (yan etkisiz) —
 *    saha seçim modalında "onayla" buna basar; hiçbir şey silinmez.
 *  - schedule: RevenueCat satın alma TAMAMLANDIKTAN sonra tek transaction'da
 *    abonelik pending alanları + seçilen sahaları pasif + scheduledDeletionAt=X
 *    yapar (soft-delete YOK). X öncesi bekleyen kayıtlar korunur; X sonrası
 *    PENDING'ler iptal edilir. X'e kadar owner sahayı toggle ile geri açabilir.
 *  - cron: X geçen sahaları soft-delete eder, X'e 3 gün kala hatırlatır.
 * Modül yeri: PitchesModule (SubscriptionModule yaprak kalmalı — agent.md;
 * Notifications/Subscription importu burada döngü oluşturmaz).
 */
@Injectable()
export class PitchDowngradeService {
  private readonly logger = new Logger(PitchDowngradeService.name);

  constructor(
    @InjectRepository(Pitch)
    private pitchesRepository: Repository<Pitch>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(BusinessOwner)
    private businessOwnerRepository: Repository<BusinessOwner>,
    private reservationsService: ReservationsService,
    private subscriptionService: SubscriptionService,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
  ) {}

  // ===== VALIDATION (ortak: precheck + schedule) =====

  private async validateDowngrade(
    ownerId: string,
    planType: string,
    pitchIdsRaw: string[],
    manager?: EntityManager,
  ) {
    const ownerRepo =
      manager?.getRepository(BusinessOwner) ?? this.businessOwnerRepository;
    const subRepo =
      manager?.getRepository(Subscription) ?? this.subscriptionRepository;
    const pitchRepo = manager?.getRepository(Pitch) ?? this.pitchesRepository;
    const resRepo =
      manager?.getRepository(Reservation) ?? this.reservationRepository;

    const plan = SUBSCRIPTION_PLANS[planType];
    if (!plan) throw new NotFoundException('Geçersiz plan tipi.');

    const owner = await ownerRepo.findOne({
      where: { id: ownerId },
      relations: ['business'],
    });
    if (!owner?.business) throw new NotFoundException('İşletme bulunamadı.');

    const subscription = await subRepo.findOne({ where: { ownerId } });
    if (!subscription) throw new NotFoundException('Abonelik bulunamadı.');

    const currentPlan = SUBSCRIPTION_PLANS[subscription.planType];
    if (currentPlan && plan.pitchCount >= currentPlan.pitchCount) {
      throw new BadRequestException('Bu işlem bir plan düşürme değil.');
    }

    // X: sahaların silineceği tarih = mevcut ödenmiş dönemin sonu.
    const effectiveAt = subscription.expiresAt ?? subscription.trialEndsAt;
    if (!effectiveAt) {
      throw new BadRequestException(
        'Abonelik dönem bilginiz bulunamadığı için plan düşürme planlanamıyor. Lütfen destek ile iletişime geçin.',
      );
    }

    const pitchIds = [...new Set(pitchIdsRaw)];

    // Kullanılan saha sayısı = onaylı + onay bekleyen (silinmemiş) — client
    // usedPitchCount ile aynı semantik (useBusinessPitchList.ts).
    const pitches = await pitchRepo.find({
      where: { businessId: owner.business.id, deletedAt: IsNull() },
    });
    const usable = pitches.filter((p) => p.approvalStatus !== 'rejected');
    const required = Math.max(0, usable.length - plan.pitchCount);
    if (pitchIds.length !== required) {
      throw new BadRequestException(
        `Bu plana geçmek için kaldırılacak ${required} saha seçmelisiniz.`,
      );
    }

    const usableById = new Map(usable.map((p) => [p.id, p]));
    const selected: Pitch[] = [];
    for (const id of pitchIds) {
      const pitch = usableById.get(id);
      if (!pitch) {
        throw new NotFoundException(
          'Seçilen saha bulunamadı veya bu işletmeye ait değil.',
        );
      }
      selected.push(pitch);
    }

    // X ve sonrasında KESİNLEŞMİŞ takım maçı olan saha seçilemez (X öncesi
    // maçlar sahayı X'e kadar kullanılabilir tuttuğumuz için engel değildir).
    // teamId IS NULL olan APPROVED kayıtlar kapatma bloklarıdır — veto etmez,
    // silme cron'u onları kendisi temizler.
    for (const pitch of selected) {
      const conflicts = await resRepo.find({
        where: {
          pitchId: pitch.id,
          status: ReservationStatus.APPROVED,
          slotTime: MoreThanOrEqual(effectiveAt),
          teamId: Not(IsNull()),
        },
        relations: ['team'],
        order: { slotTime: 'ASC' },
      });
      if (conflicts.length > 0) {
        throw new ConflictException({
          message: 'Kesinleşmiş maçlar var',
          pitchId: pitch.id,
          conflicts: conflicts.map((c) => ({
            id: c.id,
            slotTime: c.slotTime,
            teamName: c.team?.name || 'Bilinmiyor',
          })),
        });
      }
    }

    return { business: owner.business, subscription, effectiveAt, selected };
  }

  // ===== PRECHECK (yan etkisiz — saha seçim modalının "onayla" adımı) =====

  async precheckDowngrade(
    ownerId: string,
    planType: string,
    pitchIds: string[],
  ) {
    const { effectiveAt, selected } = await this.validateDowngrade(
      ownerId,
      planType,
      pitchIds,
    );
    return {
      ok: true,
      effectiveAt,
      pitchIds: selected.map((p) => p.id),
    };
  }

  // ===== SCHEDULE (satın alma tamamlandıktan sonra, tek transaction) =====

  async scheduleDowngrade(
    ownerId: string,
    planType: string,
    rcCustomerId: string,
    pitchIds: string[],
  ) {
    const result = await this.dataSource.transaction(async (manager) => {
      // Eşzamanlı çağrıları (çift tık / retry) serileştir. QueryBuilder ile
      // kilitleniyor — findOne eager join'leri FOR UPDATE ile çakışır.
      await manager
        .getRepository(Subscription)
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.ownerId = :ownerId', { ownerId })
        .getOne();

      const { business, effectiveAt, selected } = await this.validateDowngrade(
        ownerId,
        planType,
        pitchIds,
        manager,
      );
      const selectedIds = selected.map((p) => p.id);

      // Yeniden planlama: önceki düşürmede işaretlenmiş ama artık seçili
      // olmayan sahaların planlamasını kaldır + geri aktif et.
      const previouslyScheduled = await manager.getRepository(Pitch).find({
        where: {
          businessId: business.id,
          scheduledDeletionAt: Not(IsNull()),
          deletedAt: IsNull(),
        },
      });
      const toReset = previouslyScheduled.filter(
        (p) => !selectedIds.includes(p.id),
      );
      if (toReset.length > 0) {
        await manager.update(
          Pitch,
          { id: In(toReset.map((p) => p.id)) },
          {
            scheduledDeletionAt: null,
            deletionReminderSentAt: null,
            isActive: true,
          },
        );
      }

      if (selectedIds.length > 0) {
        // Pasif + X'te silinmek üzere işaretle (soft-delete YOK — owner X'e
        // kadar toggle ile geri açabilir).
        await manager.update(
          Pitch,
          { id: In(selectedIds) },
          {
            isActive: false,
            scheduledDeletionAt: effectiveAt,
            deletionReminderSentAt: null,
          },
        );

        // Yalnız X ve SONRASI için bekleyen rezervasyon/ilanları iptal et —
        // X öncesi kayıtlar sahayla birlikte yaşamaya devam eder.
        await this.reservationsService.cancelPendingForPitches(
          selectedIds,
          {
            scope: 'PITCH_SCHEDULED_OFFLINE',
            businessName: business.name,
            pitchNameById: new Map(selected.map((p) => [p.id, p.name])),
            fromTime: effectiveAt,
          },
          manager,
        );
      }

      const subscription = await this.subscriptionService.scheduleDowngrade(
        ownerId,
        planType,
        rcCustomerId,
        manager,
      );

      return { subscription, effectiveAt, selected, ownerId };
    });

    // Bildirimler best-effort (approve() emsali) — transaction dışı.
    const dateStr = istanbulDisplayParts(
      result.effectiveAt,
    ).displayDateWithYear;
    for (const pitch of result.selected) {
      try {
        await this.notificationsService.create({
          userId: result.ownerId,
          type: 'PITCH_DELETION_SCHEDULED',
          title: 'Saha Silme Planlandı',
          message: `${pitch.name} sahanızı ${dateStr} tarihine kadar kullanmaya devam edebilirsiniz; dilerseniz o tarihe kadar ayarlardan tekrar aktifleştirebilirsiniz. Saha ${dateStr} tarihinde otomatik olarak silinecektir.`,
          relatedId: pitch.id,
          read: false,
          metadata: { pitchId: pitch.id, effectiveAt: result.effectiveAt },
        });
      } catch (err) {
        this.logger.error(
          'PITCH_DELETION_SCHEDULED bildirimi gönderilemedi:',
          err,
        );
      }
    }

    return {
      subscription: result.subscription,
      effectiveAt: result.effectiveAt,
      scheduledPitchIds: result.selected.map((p) => p.id),
    };
  }

  // ===== CRON: vadesi gelen sahaları sil + yaklaşanları hatırlat =====

  @Cron(CronExpression.EVERY_HOUR, { name: 'pitch_scheduled_deletions' })
  async processScheduledDeletions() {
    const now = new Date();

    const due = await this.pitchesRepository.find({
      where: { scheduledDeletionAt: LessThanOrEqual(now), deletedAt: IsNull() },
    });
    for (const pitch of due) {
      try {
        await this.deleteScheduledPitch(pitch.id);
      } catch (err) {
        this.logger.error(`Planlı saha silme başarısız (${pitch.id}):`, err);
      }
    }

    const toRemind = await this.pitchesRepository.find({
      where: {
        deletedAt: IsNull(),
        deletionReminderSentAt: IsNull(),
        scheduledDeletionAt: Between(
          now,
          new Date(now.getTime() + REMINDER_WINDOW_MS),
        ),
      },
    });
    for (const pitch of toRemind) {
      try {
        await this.sendDeletionReminder(pitch, now);
      } catch (err) {
        this.logger.error(
          `Saha silme hatırlatması başarısız (${pitch.id}):`,
          err,
        );
      }
    }
  }

  private async sendDeletionReminder(pitch: Pitch, now: Date): Promise<void> {
    const owner = await this.businessOwnerRepository.findOne({
      where: { business: { id: pitch.businessId } },
    });
    if (!owner || !pitch.scheduledDeletionAt) return;

    const dateStr = istanbulDisplayParts(
      pitch.scheduledDeletionAt,
    ).displayDateWithYear;
    await this.notificationsService.create({
      userId: owner.id,
      type: 'PITCH_DELETION_REMINDER',
      title: 'Saha Silme Hatırlatması',
      message: `${pitch.name} sahanız ${dateStr} tarihinde silinecek. Planınızı kontrol etmenizi öneririz.`,
      relatedId: pitch.id,
      read: false,
      metadata: { pitchId: pitch.id, effectiveAt: pitch.scheduledDeletionAt },
    });
    await this.pitchesRepository.update(
      { id: pitch.id },
      { deletionReminderSentAt: now },
    );
  }

  /**
   * Vadesi gelen tek sahayı kendi transaction'ında siler. Pitch satırı
   * kilitlenir ve vade tekrar doğrulanır — eşzamanlı yükseltme
   * (confirmPurchase scheduledDeletionAt'i temizler) ile yarışta tek taraf
   * kazanır. Plan sahayı hâlâ kapsıyorsa silme yerine planlama temizlenir
   * (emniyet ağı).
   */
  private async deleteScheduledPitch(pitchId: string): Promise<void> {
    const done = await this.dataSource.transaction(async (manager) => {
      // findOne + eager timeSlots join'i FOR UPDATE ile çakışır → QueryBuilder.
      const pitch = await manager
        .getRepository(Pitch)
        .createQueryBuilder('p')
        .setLock('pessimistic_write')
        .where('p.id = :id', { id: pitchId })
        .getOne();

      const now = new Date();
      if (
        !pitch ||
        pitch.deletedAt ||
        !pitch.scheduledDeletionAt ||
        pitch.scheduledDeletionAt > now
      ) {
        return null; // yükseltme planlamayı iptal etmiş / zaten silinmiş
      }

      const owner = await manager.getRepository(BusinessOwner).findOne({
        where: { business: { id: pitch.businessId } },
        relations: ['business'],
      });
      const businessName = owner?.business?.name || 'İşletme';

      // Emniyet ağı: geçerli plan (vadesi gelen pending dahil) bu sahayı hâlâ
      // kapsıyorsa silme — planlamayı temizle (tutarsız durum/yarış artığı).
      if (owner) {
        const subscription = await manager
          .getRepository(Subscription)
          .findOne({ where: { ownerId: owner.id } });
        if (subscription) {
          const effPlanType =
            subscription.pendingPlanType &&
            subscription.pendingPlanEffectiveAt &&
            subscription.pendingPlanEffectiveAt <= now
              ? subscription.pendingPlanType
              : subscription.planType;
          const effPlan = SUBSCRIPTION_PLANS[effPlanType];
          const activeCount = await manager.getRepository(Pitch).count({
            where: [
              {
                businessId: pitch.businessId,
                approvalStatus: 'approved',
                deletedAt: IsNull(),
              },
              {
                businessId: pitch.businessId,
                approvalStatus: 'pending',
                deletedAt: IsNull(),
              },
            ],
          });
          if (effPlan && activeCount <= effPlan.pitchCount) {
            await manager.update(
              Pitch,
              { id: pitchId },
              { scheduledDeletionAt: null, deletionReminderSentAt: null },
            );
            this.logger.warn(
              `Saha ${pitchId} plana sığıyor — silme atlandı, planlama temizlendi.`,
            );
            return null;
          }
        }
      }

      // Gelecekteki takımsız APPROVED bloklar (sürekli kapatma/manuel doldurma)
      // sahayla birlikte kalkar.
      await manager.getRepository(Reservation).update(
        {
          pitchId,
          status: ReservationStatus.APPROVED,
          teamId: IsNull(),
          slotTime: MoreThanOrEqual(now),
        },
        { status: ReservationStatus.CANCELLED },
      );

      // Savunmacı: X sonrası takımlı APPROVED maç kalmamalı (schedule +
      // create guard'ları engeller) — kalmışsa iptal et ve logla; oyuncu
      // bildirimleri commit sonrası gönderilir.
      const strayApproved = await manager.getRepository(Reservation).find({
        where: {
          pitchId,
          status: ReservationStatus.APPROVED,
          teamId: Not(IsNull()),
          slotTime: MoreThanOrEqual(now),
        },
        relations: [
          'team',
          'team.players',
          'opponentTeam',
          'opponentTeam.players',
        ],
      });
      if (strayApproved.length > 0) {
        this.logger.error(
          `Saha ${pitchId} silinirken ${strayApproved.length} kesinleşmiş maç bulundu (beklenmiyordu) — iptal ediliyor.`,
        );
        await manager.update(
          Reservation,
          { id: In(strayApproved.map((r) => r.id)) },
          { status: ReservationStatus.CANCELLED },
        );
      }

      // Sürekli kapatma kuralları pasif — 3AM top-up cron'u ölü sahaya slot
      // üretmeye devam etmesin.
      await manager
        .getRepository(RecurringClosure)
        .update({ pitchId }, { isActive: false });

      // Bekleyen rezervasyon/ilan iptali + takım bildirimleri (mevcut kaldırma
      // semantiği — scope PITCH_REMOVED, şu andan itibaren).
      await this.reservationsService.cancelPendingForPitches(
        [pitchId],
        {
          scope: 'PITCH_REMOVED',
          businessName,
          pitchNameById: new Map([[pitchId, pitch.name]]),
        },
        manager,
      );

      await manager.update(
        Pitch,
        { id: pitchId },
        { isActive: false, deletedAt: now, scheduledDeletionAt: null },
      );

      return {
        ownerId: owner?.id ?? null,
        pitchName: pitch.name,
        businessName,
        strayApproved,
      };
    });

    if (!done) return;
    this.logger.log(`Planlı saha silindi: ${done.pitchName} (${pitchId})`);

    // Owner bildirimi (best-effort).
    if (done.ownerId) {
      try {
        await this.notificationsService.create({
          userId: done.ownerId,
          type: 'PITCH_DELETED',
          title: 'Sahanız Silindi',
          message: `${done.pitchName} sahanız, plan düşürme talebiniz doğrultusunda fatura dönemi sonunda otomatik olarak silindi.`,
          relatedId: pitchId,
          read: false,
          metadata: { pitchId },
        });
      } catch (err) {
        this.logger.error('PITCH_DELETED bildirimi gönderilemedi:', err);
      }
    }

    // Beklenmedik kesinleşmiş maç iptallerinde oyunculara bildirim.
    for (const res of done.strayApproved) {
      const parts = istanbulDisplayParts(new Date(res.slotTime));
      const whenStr = `${parts.displayDateWithYear} ${parts.dayName} ${parts.time}`;
      const seen = new Set<string>();
      const players = [
        ...(res.team?.players ?? []),
        ...(res.opponentTeam?.players ?? []),
      ];
      for (const player of players) {
        if (!player?.id || seen.has(player.id)) continue;
        seen.add(player.id);
        try {
          await this.notificationsService.create({
            userId: player.id,
            type: 'SYSTEM',
            title: 'Maçınız İptal Edildi',
            message: `${done.businessName} - ${done.pitchName} kaldırıldığı için ${whenStr} saatindeki maçınız iptal edildi. Yakındaki diğer sahalara göz atabilirsiniz.`,
            relatedId: res.id,
            read: false,
            metadata: { type: 'PITCH_REMOVED', reservationId: res.id },
          });
        } catch (err) {
          this.logger.error('İptal bildirimi gönderilemedi:', err);
        }
      }
    }
  }
}
