import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PitchesService } from './pitches.service';
import { PitchesController } from './pitches.controller';
import { Pitch } from './entities/pitch.entity';
import { TimeSlot } from './entities/time-slot.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { PitchChangeRequest } from './entities/pitch-change-request.entity';
import { Subscription } from '../subscription/entities/subscription.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pitch,
      TimeSlot,
      Reservation,
      PitchChangeRequest,
      Subscription,
      BusinessOwner,
    ]),
    ReservationsModule,
  ],
  controllers: [PitchesController],
  providers: [PitchesService],
  exports: [PitchesService],
})
export class PitchesModule {}
