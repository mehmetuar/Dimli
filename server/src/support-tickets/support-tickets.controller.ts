import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SupportTicketsService } from './support-tickets.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('support-tickets')
@UseGuards(JwtAuthGuard)
export class SupportTicketsController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  @Post('user')
  async createUserTicket(
    @Body() dto: CreateSupportTicketDto,
    @Request() req: { user: Express.User },
  ) {
    await this.supportTicketsService.createUserTicket(req.user.id, dto);
    return { success: true };
  }

  @Get('user/mine')
  getMyUserTickets(@Request() req: { user: Express.User }) {
    return this.supportTicketsService.getMyUserTickets(req.user.id);
  }

  @Post('business')
  async createBusinessTicket(
    @Body() dto: CreateSupportTicketDto,
    @Request() req: { user: Express.User },
  ) {
    await this.supportTicketsService.createBusinessTicket(req.user.id, dto);
    return { success: true };
  }

  @Get('business/mine')
  getMyBusinessTickets(@Request() req: { user: Express.User }) {
    return this.supportTicketsService.getMyBusinessTickets(req.user.id);
  }
}
