import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { Subscription } from './entities/subscription.entity';
import { Pitch } from '../pitches/entities/pitch.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { Notification } from '../notifications/notification.entity';

// ⚠️ Yalnız ENTITY forFeature'ları eklenir — modül importu (Notifications/
// Pitches/Reservations) döngü yaratır; SubscriptionModule yaprak kalmalı.
@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Pitch, BusinessOwner, Notification]),
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
