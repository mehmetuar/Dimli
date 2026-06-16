import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserReport, ReportStatus } from './user-report.entity';

@Injectable()
export class UserReportsService {
  constructor(
    @InjectRepository(UserReport)
    private userReportRepository: Repository<UserReport>,
  ) {}

  async createReport(
    reporterId: string,
    reportedUserId: string,
    messageId?: string,
    channelId?: string,
    note?: string,
  ): Promise<UserReport> {
    if (reporterId === reportedUserId) {
      throw new BadRequestException('Kendinizi şikayet edemezsiniz.');
    }
    const report = this.userReportRepository.create({
      reporterId,
      reportedUserId,
      messageId: messageId ?? null,
      channelId: channelId ?? null,
      note: note ?? null,
      status: 'pending',
    });
    return this.userReportRepository.save(report);
  }

  async getAllReports(status?: ReportStatus): Promise<UserReport[]> {
    return this.userReportRepository.find({
      where: status ? { status } : {},
      relations: ['reporter', 'reportedUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateReportStatus(
    id: string,
    status: ReportStatus,
  ): Promise<UserReport> {
    const report = await this.userReportRepository.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Rapor bulunamadı.');
    report.status = status;
    return this.userReportRepository.save(report);
  }

  async getPendingCount(): Promise<number> {
    return this.userReportRepository.count({ where: { status: 'pending' } });
  }
}
