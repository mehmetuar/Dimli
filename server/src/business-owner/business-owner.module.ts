import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessOwnerService } from './business-owner.service';
import { BusinessOwnerController } from './business-owner.controller';
import { BusinessOwner } from './entities/business-owner.entity';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([BusinessOwner]),
        ReservationsModule,
    ],
    controllers: [BusinessOwnerController],
    providers: [BusinessOwnerService],
    exports: [BusinessOwnerService],
})
export class BusinessOwnerModule { }
