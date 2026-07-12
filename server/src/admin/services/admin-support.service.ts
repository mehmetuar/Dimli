import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SupportAudience,
  SupportTicket,
  SupportTicketStatus,
} from '../../support-tickets/support-ticket.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Paginated, paginate } from '../../common/dto/paginated';
import { applySearch } from './admin.util';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class AdminSupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepository: Repository<SupportTicket>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getSupportTickets(
    audience: SupportAudience | undefined,
    status: SupportTicketStatus | undefined,
    p: PaginationQueryDto,
  ): Promise<Paginated<SupportTicket>> {
    const skip = (p.page - 1) * p.limit;
    const searchCols = ['u.username', 'u.full_name', 'o.fullName', 'b.name'];
    const hasSearch = !!p.search?.trim();

    const applyFilters = (
      qb: ReturnType<Repository<SupportTicket>['createQueryBuilder']>,
    ) => {
      if (audience) qb.andWhere('t.audience = :audience', { audience });
      if (status) qb.andWhere('t.status = :status', { status });
    };

    // COUNT: join'ler yalnız arama varsa (ManyToOne → satır çoğaltmaz).
    const countQb = this.ticketRepository.createQueryBuilder('t');
    applyFilters(countQb);
    if (hasSearch) {
      countQb
        .leftJoin('t.user', 'u')
        .leftJoin('t.owner', 'o')
        .leftJoin('o.business', 'b');
    }
    applySearch(countQb, p.search, searchCols);
    const total = await countQb.getCount();

    // ITEMS: başvuran bilgisi tek sorguda, YALNIZ gerekli kolonlar
    // (leftJoinAndSelect kullanma — User'da parola hash'i/pushToken var).
    const itemsQb = this.ticketRepository
      .createQueryBuilder('t')
      .leftJoin('t.user', 'u')
      .addSelect([
        'u.id',
        'u.username',
        'u.full_name',
        'u.email',
        'u.phone',
        'u.location',
        'u.avatarUrl',
      ])
      .leftJoin('t.owner', 'o')
      .addSelect(['o.id', 'o.fullName', 'o.email', 'o.phone'])
      .leftJoin('o.business', 'b')
      .addSelect([
        'b.id',
        'b.name',
        'b.city',
        'b.district',
        'b.phone',
        'b.status',
        'b.deletedAt',
      ]);
    applyFilters(itemsQb);
    applySearch(itemsQb, p.search, searchCols);
    itemsQb.orderBy('t.createdAt', 'DESC').skip(skip).take(p.limit);
    const items = await itemsQb.getMany();

    return paginate(items, total, p.page, p.limit);
  }

  async replyToTicket(id: string, reply: string) {
    const trimmed = reply?.trim();
    if (!trimmed) throw new BadRequestException('Yanıt metni boş olamaz.');
    if (trimmed.length > 2000)
      throw new BadRequestException('Yanıt en fazla 2000 karakter olabilir.');

    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Talep bulunamadı.');
    if (ticket.status !== 'pending')
      throw new BadRequestException(
        'Yalnızca bekleyen talepler yanıtlanabilir.',
      );

    ticket.adminReply = trimmed;
    ticket.status = 'answered';
    ticket.repliedAt = new Date();
    const saved = await this.ticketRepository.save(ticket);

    // Başvurana bildirim: create() DB + websocket + FCM push'u tek noktadan yürütür.
    const targetId =
      ticket.audience === 'user' ? ticket.userId : ticket.ownerId;
    if (targetId) {
      await this.notificationsService.create(
        ticket.audience === 'user'
          ? {
              userId: targetId,
              type: 'SYSTEM',
              title: 'Destek Talebiniz Yanıtlandı',
              message: trimmed,
              metadata: { type: 'SUPPORT_REPLY', ticketId: ticket.id },
            }
          : {
              userId: targetId,
              type: 'SUPPORT_REPLY',
              title: 'Destek Talebiniz Yanıtlandı',
              message: trimmed,
              metadata: { ticketId: ticket.id },
            },
      );
    }

    return saved;
  }

  async markReviewed(id: string) {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Talep bulunamadı.');
    if (ticket.status !== 'pending')
      throw new BadRequestException('Talep zaten sonuçlandırılmış.');
    ticket.status = 'reviewed';
    return this.ticketRepository.save(ticket);
  }

  async getPendingCount() {
    const rows: Array<{ audience: SupportAudience; c: string }> =
      await this.ticketRepository
        .createQueryBuilder('t')
        .select('t.audience', 'audience')
        .addSelect('COUNT(*)', 'c')
        .where("t.status = 'pending'")
        .groupBy('t.audience')
        .getRawMany();
    const user = Number(rows.find((r) => r.audience === 'user')?.c ?? 0);
    const business = Number(
      rows.find((r) => r.audience === 'business')?.c ?? 0,
    );
    return { total: user + business, user, business };
  }
}
