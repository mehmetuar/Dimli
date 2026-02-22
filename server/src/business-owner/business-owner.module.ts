import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessOwnerService } from './business-owner.service';
import { BusinessOwnerController } from './business-owner.controller';
import { BusinessOwner } from './entities/business-owner.entity';
import { ReservationsModule } from '../reservations/reservations.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([BusinessOwner]),
        ReservationsModule,
        NotificationsModule,
    ],
    controllers: [BusinessOwnerController],
    providers: [BusinessOwnerService],
    exports: [BusinessOwnerService],
})
export class BusinessOwnerModule { }
