import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PitchesService } from './pitches.service';
import { PitchesController } from './pitches.controller';
import { Pitch } from './entities/pitch.entity';
import { TimeSlot } from './entities/time-slot.entity';
import { Reservation } from '../reservations/entities/reservation.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Pitch, TimeSlot, Reservation])],
    controllers: [PitchesController],
    providers: [PitchesService],
    exports: [PitchesService],
})
export class PitchesModule { }

