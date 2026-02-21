import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PitchesService } from './pitches.service';
import { PitchesController } from './pitches.controller';
import { Pitch } from './entities/pitch.entity';
import { TimeSlot } from './entities/time-slot.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Pitch, TimeSlot])],
    controllers: [PitchesController],
    providers: [PitchesService],
    exports: [PitchesService],
})
export class PitchesModule { }

