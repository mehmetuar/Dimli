import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { Business } from './entities/business.entity';
import { PitchesModule } from '../pitches/pitches.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Business]),
        PitchesModule
    ],
    controllers: [BusinessController],
    providers: [BusinessService],
    exports: [BusinessService],
})
export class BusinessModule { }
