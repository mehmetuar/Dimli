import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import {
  BUSINESS_SUPPORT_CATEGORIES,
  SupportTicket,
  USER_SUPPORT_CATEGORIES,
} from './support-ticket.entity';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { User } from '../users/user.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';

// 24 saatte submitter başına en fazla bu kadar talep (kötüye kullanım koruması).
const DAILY_TICKET_LIMIT = 5;
const DAILY_LIMIT_MESSAGE =
  'Günlük destek talebi sınırına ulaştınız. Lütfen yarın tekrar deneyin veya destek@dimli.com.tr adresine yazın.';

const MY_TICKETS_SELECT: (keyof SupportTicket)[] = [
  'id',
  'category',
  'message',
  'status',
  'adminReply',
  'repliedAt',
  'createdAt',
];

@Injectable()
export class SupportTicketsService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepository: Repository<SupportTicket>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(BusinessOwner)
    private readonly businessOwnerRepository: Repository<BusinessOwner>,
  ) {}

  async createUserTicket(userId: string, dto: CreateSupportTicketDto) {
    const exists = await this.userRepository.exists({ where: { id: userId } });
    if (!exists) throw new ForbiddenException();

    this.validateCategory(dto.category, USER_SUPPORT_CATEGORIES);
    await this.enforceDailyLimit({ userId });

    return this.ticketRepository.save(
      this.ticketRepository.create({
        audience: 'user',
        userId,
        category: dto.category,
        message: dto.message.trim(),
      }),
    );
  }

  async createBusinessTicket(ownerId: string, dto: CreateSupportTicketDto) {
    const exists = await this.businessOwnerRepository.exists({
      where: { id: ownerId },
    });
    if (!exists) throw new ForbiddenException();

    this.validateCategory(dto.category, BUSINESS_SUPPORT_CATEGORIES);
    await this.enforceDailyLimit({ ownerId });

    return this.ticketRepository.save(
      this.ticketRepository.create({
        audience: 'business',
        ownerId,
        category: dto.category,
        message: dto.message.trim(),
      }),
    );
  }

  getMyUserTickets(userId: string) {
    return this.ticketRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
      select: MY_TICKETS_SELECT,
    });
  }

  getMyBusinessTickets(ownerId: string) {
    return this.ticketRepository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
      take: 50,
      select: MY_TICKETS_SELECT,
    });
  }

  private validateCategory(category: string, allowed: readonly string[]) {
    if (!allowed.includes(category)) {
      throw new BadRequestException('Geçersiz kategori.');
    }
  }

  private async enforceDailyLimit(where: {
    userId?: string;
    ownerId?: string;
  }) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await this.ticketRepository.count({
      where: { ...where, createdAt: MoreThan(since) },
    });
    if (count >= DAILY_TICKET_LIMIT) {
      throw new BadRequestException(DAILY_LIMIT_MESSAGE);
    }
  }
}
