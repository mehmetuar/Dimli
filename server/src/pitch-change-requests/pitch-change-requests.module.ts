import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PitchChangeRequestsService } from './pitch-change-requests.service';
import { PitchChangeRequestsController } from './pitch-change-requests.controller';
import { PitchChangeRequest } from '../pitches/entities/pitch-change-request.entity';
import { Pitch } from '../pitches/entities/pitch.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { Notification } from '../notifications/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PitchChangeRequest,
      Pitch,
      BusinessOwner,
      Notification,
    ]),
  ],
  controllers: [PitchChangeRequestsController],
  providers: [PitchChangeRequestsService],
  exports: [PitchChangeRequestsService],
})
export class PitchChangeRequestsModule {}
