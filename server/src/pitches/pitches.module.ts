import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PitchesService } from './pitches.service';
import { PitchDowngradeService } from './pitch-downgrade.service';
import { PitchesController } from './pitches.controller';
import { Pitch } from './entities/pitch.entity';
import { TimeSlot } from './entities/time-slot.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { RecurringClosure } from '../reservations/entities/recurring-closure.entity';
import { PitchChangeRequest } from './entities/pitch-change-request.entity';
import { Subscription } from '../subscription/entities/subscription.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { ReservationsModule } from '../reservations/reservations.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { NotificationsModule } from '../notifications/notifications.module';

// Plan düşürme orkestrasyonu (PitchDowngradeService) burada yaşar:
// SubscriptionModule yaprak kalmalı (Reservations→Subscription importu var);
// Pitches'in Notifications+Subscription importu döngü oluşturmaz.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pitch,
      TimeSlot,
      Reservation,
      RecurringClosure,
      PitchChangeRequest,
      Subscription,
      BusinessOwner,
    ]),
    ReservationsModule,
    SubscriptionModule,
    NotificationsModule,
  ],
  controllers: [PitchesController],
  providers: [PitchesService, PitchDowngradeService],
  exports: [PitchesService],
})
export class PitchesModule {}
