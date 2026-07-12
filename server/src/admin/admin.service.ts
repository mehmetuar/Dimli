import { Injectable } from '@nestjs/common';
import { ReportStatus } from '../user-reports/user-report.entity';
import {
  SupportAudience,
  SupportTicketStatus,
} from '../support-tickets/support-ticket.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminBusinessService } from './services/admin-business.service';
import { AdminPitchReviewService } from './services/admin-pitch-review.service';
import { AdminModerationService } from './services/admin-moderation.service';
import { AdminStatisticsService } from './services/admin-statistics.service';
import { AdminSubscriptionService } from './services/admin-subscription.service';
import { AdminSupportService } from './services/admin-support.service';

/**
 * Admin facade — genel admin API'sini korur ama mantık cohesive alt-servislere
 * delege edilir (auth / business / pitch-review / moderation / statistics /
 * subscription). Controller ve dış çağıranlar için imzalar birebir aynıdır.
 * Alt-servisler ayrı dosyalarda: `admin/services/*`.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly authService: AdminAuthService,
    private readonly businessService: AdminBusinessService,
    private readonly pitchReviewService: AdminPitchReviewService,
    private readonly moderationService: AdminModerationService,
    private readonly statisticsService: AdminStatisticsService,
    private readonly subscriptionService: AdminSubscriptionService,
    private readonly supportService: AdminSupportService,
  ) {}

  // ─── Auth ─────────────────────────────────────────────────────────────────

  login(email: string, password: string) {
    return this.authService.login(email, password);
  }

  createAdmin(email: string, password: string, role: string = 'reviewer') {
    return this.authService.createAdmin(email, password, role);
  }

  // ─── Applications / Businesses ──────────────────────────────────────────────

  getApplications(status: string | undefined, p: PaginationQueryDto) {
    return this.businessService.getApplications(status, p);
  }

  getApplicationDetail(businessId: string) {
    return this.businessService.getApplicationDetail(businessId);
  }

  approveApplication(businessId: string, adminId: string) {
    return this.businessService.approveApplication(businessId, adminId);
  }

  rejectApplication(businessId: string, adminId: string, reason: string) {
    return this.businessService.rejectApplication(businessId, adminId, reason);
  }

  updateApplication(
    businessId: string,
    body: Parameters<AdminBusinessService['updateApplication']>[1],
  ) {
    return this.businessService.updateApplication(businessId, body);
  }

  getAllBusinesses(status: string | undefined, p: PaginationQueryDto) {
    return this.businessService.getAllBusinesses(status, p);
  }

  getDeletedBusinesses(p: PaginationQueryDto) {
    return this.businessService.getDeletedBusinesses(p);
  }

  suspendBusiness(businessId: string) {
    return this.businessService.suspendBusiness(businessId);
  }

  activateBusiness(businessId: string) {
    return this.businessService.activateBusiness(businessId);
  }

  restoreBusiness(businessId: string, adminId: string) {
    return this.businessService.restoreBusiness(businessId, adminId);
  }

  // ─── Change Requests / Pitch Approvals ──────────────────────────────────────

  getChangeRequests(status: string | undefined, p: PaginationQueryDto) {
    return this.pitchReviewService.getChangeRequests(status, p);
  }

  approveChangeRequest(requestId: string) {
    return this.pitchReviewService.approveChangeRequest(requestId);
  }

  rejectChangeRequest(requestId: string, reason: string) {
    return this.pitchReviewService.rejectChangeRequest(requestId, reason);
  }

  getPitchApprovals(status: string | undefined, p: PaginationQueryDto) {
    return this.pitchReviewService.getPitchApprovals(status, p);
  }

  approvePitch(pitchId: string) {
    return this.pitchReviewService.approvePitch(pitchId);
  }

  rejectPitch(pitchId: string, reason: string) {
    return this.pitchReviewService.rejectPitch(pitchId, reason);
  }

  // ─── Statistics / Deletion Report ───────────────────────────────────────────

  getStatistics() {
    return this.statisticsService.getStatistics();
  }

  getDeletionReport() {
    return this.moderationService.getDeletionReport();
  }

  // ─── User Reports / Chat Ban ────────────────────────────────────────────────

  getReports(status: ReportStatus | undefined, p: PaginationQueryDto) {
    return this.moderationService.getReports(status, p);
  }

  updateReportStatus(id: string, status: ReportStatus) {
    return this.moderationService.updateReportStatus(id, status);
  }

  getPendingReportCount() {
    return this.moderationService.getPendingReportCount();
  }

  getBannedUsers(p: PaginationQueryDto) {
    return this.moderationService.getBannedUsers(p);
  }

  chatBanUser(userId: string, durationHours?: number) {
    return this.moderationService.chatBanUser(userId, durationHours);
  }

  chatUnbanUser(userId: string) {
    return this.moderationService.chatUnbanUser(userId);
  }

  // ─── Support Tickets ────────────────────────────────────────────────────────

  getSupportTickets(
    audience: SupportAudience | undefined,
    status: SupportTicketStatus | undefined,
    p: PaginationQueryDto,
  ) {
    return this.supportService.getSupportTickets(audience, status, p);
  }

  replyToSupportTicket(id: string, reply: string) {
    return this.supportService.replyToTicket(id, reply);
  }

  markSupportTicketReviewed(id: string) {
    return this.supportService.markReviewed(id);
  }

  getSupportPendingCount() {
    return this.supportService.getPendingCount();
  }

  // ─── Maintenance ────────────────────────────────────────────────────────────

  seedMissingSubscriptions() {
    return this.subscriptionService.seedMissingSubscriptions();
  }
}
