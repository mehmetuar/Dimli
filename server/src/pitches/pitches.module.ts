import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PitchesService } from './pitches.service';
import { PitchesController } from './pitches.controller';
import { Pitch } from './entities/pitch.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Pitch])],
    controllers: [PitchesController],
    providers: [PitchesService],
    exports: [PitchesService],
})
export class PitchesModule { }
