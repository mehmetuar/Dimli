import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from './support-ticket.entity';
import { SupportTicketsService } from './support-tickets.service';
import { SupportTicketsController } from './support-tickets.controller';
import { User } from '../users/user.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket, User, BusinessOwner])],
  controllers: [SupportTicketsController],
  providers: [SupportTicketsService],
  exports: [SupportTicketsService],
})
export class SupportTicketsModule {}
