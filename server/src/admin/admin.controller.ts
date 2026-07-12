import {
  BadRequestException,
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminJwtAuthGuard } from './admin-jwt-auth.guard';
import { ReportStatus } from '../user-reports/user-report.entity';
import {
  SupportAudience,
  SupportTicketStatus,
} from '../support-tickets/support-ticket.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Auth ─────────────────────────────────────────────────────────────────

  @Post('auth/login')
  async login(@Body() body: { email: string; password: string }) {
    return this.adminService.login(body.email, body.password);
  }

  // ─── Applications ─────────────────────────────────────────────────────────

  @UseGuards(AdminJwtAuthGuard)
  @Get('applications')
  async getApplications(
    @Query() pagination: PaginationQueryDto,
    @Query('status') status?: string,
  ) {
    return this.adminService.getApplications(status, pagination);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('applications/:businessId')
  async getApplicationDetail(@Param('businessId') businessId: string) {
    return this.adminService.getApplicationDetail(businessId);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('applications/:businessId/approve')
  async approveApplication(
    @Param('businessId') businessId: string,
    @Request() req: { user: Express.User },
  ) {
    return this.adminService.approveApplication(businessId, req.user.id);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('applications/:businessId/reject')
  async rejectApplication(
    @Param('businessId') businessId: string,
    @Body() body: { reason: string },
    @Request() req: { user: Express.User },
  ) {
    return this.adminService.rejectApplication(
      businessId,
      req.user.id,
      body.reason,
    );
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('applications/:businessId')
  async updateApplication(
    @Param('businessId') businessId: string,
    @Body() body: Parameters<AdminService['updateApplication']>[1],
  ) {
    return this.adminService.updateApplication(businessId, body);
  }

  // ─── Statistics ───────────────────────────────────────────────────────────

  @UseGuards(AdminJwtAuthGuard)
  @Get('statistics')
  async getStatistics() {
    return this.adminService.getStatistics();
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('deletion-report')
  async getDeletionReport() {
    return this.adminService.getDeletionReport();
  }

  // ─── Businesses ───────────────────────────────────────────────────────────

  @UseGuards(AdminJwtAuthGuard)
  @Get('businesses')
  async getAllBusinesses(
    @Query() pagination: PaginationQueryDto,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllBusinesses(status, pagination);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('businesses/deleted')
  async getDeletedBusinesses(@Query() pagination: PaginationQueryDto) {
    return this.adminService.getDeletedBusinesses(pagination);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('businesses/:businessId/suspend')
  async suspendBusiness(@Param('businessId') businessId: string) {
    return this.adminService.suspendBusiness(businessId);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('businesses/:businessId/activate')
  async activateBusiness(@Param('businessId') businessId: string) {
    return this.adminService.activateBusiness(businessId);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('businesses/:businessId/restore')
  async restoreBusiness(
    @Param('businessId') businessId: string,
    @Request() req: { user: Express.User },
  ) {
    return this.adminService.restoreBusiness(businessId, req.user.id);
  }

  // ─── Change Requests ─────────────────────────────────────────────────────

  @UseGuards(AdminJwtAuthGuard)
  @Get('change-requests')
  async getChangeRequests(
    @Query() pagination: PaginationQueryDto,
    @Query('status') status?: string,
  ) {
    return this.adminService.getChangeRequests(status, pagination);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('change-requests/:id/approve')
  async approveChangeRequest(@Param('id') id: string) {
    return this.adminService.approveChangeRequest(id);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('change-requests/:id/reject')
  async rejectChangeRequest(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.adminService.rejectChangeRequest(id, body.reason);
  }

  // ─── Pitch Approvals (Yeni Saha) ────────────────────────────────────────────

  @UseGuards(AdminJwtAuthGuard)
  @Get('pitch-approvals')
  async getPitchApprovals(
    @Query() pagination: PaginationQueryDto,
    @Query('status') status?: string,
  ) {
    return this.adminService.getPitchApprovals(status, pagination);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('pitch-approvals/:id/approve')
  async approvePitchApproval(@Param('id') id: string) {
    return this.adminService.approvePitch(id);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('pitch-approvals/:id/reject')
  async rejectPitchApproval(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.adminService.rejectPitch(id, body.reason);
  }

  // ─── User Reports ─────────────────────────────────────────────────────────

  @UseGuards(AdminJwtAuthGuard)
  @Get('reports')
  async getReports(
    @Query() pagination: PaginationQueryDto,
    @Query('status') status?: string,
  ) {
    return this.adminService.getReports(
      status as ReportStatus | undefined,
      pagination,
    );
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('reports/:id/status')
  async updateReportStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateReportStatus(id, status as ReportStatus);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('reports/pending-count')
  async getPendingReportCount() {
    return this.adminService.getPendingReportCount();
  }

  // ─── Support Tickets ──────────────────────────────────────────────────────

  @UseGuards(AdminJwtAuthGuard)
  @Get('support-tickets')
  async getSupportTickets(
    @Query() pagination: PaginationQueryDto,
    @Query('audience') audience?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getSupportTickets(
      audience as SupportAudience | undefined,
      status as SupportTicketStatus | undefined,
      pagination,
    );
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('support-tickets/pending-count')
  async getSupportPendingCount() {
    return this.adminService.getSupportPendingCount();
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('support-tickets/:id/reply')
  async replyToSupportTicket(
    @Param('id') id: string,
    @Body('reply') reply: string,
  ) {
    return this.adminService.replyToSupportTicket(id, reply);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('support-tickets/:id/status')
  async markSupportTicketReviewed(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    // Yalnız 'reviewed' kabul edilir; 'answered' yalnızca reply ucundan geçilir.
    if (status !== 'reviewed') {
      throw new BadRequestException('Geçersiz durum.');
    }
    return this.adminService.markSupportTicketReviewed(id);
  }

  // ─── Chat Ban ─────────────────────────────────────────────────────────────

  @UseGuards(AdminJwtAuthGuard)
  @Get('users/banned')
  async getBannedUsers(@Query() pagination: PaginationQueryDto) {
    return this.adminService.getBannedUsers(pagination);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('users/:userId/chat-ban')
  async chatBanUser(
    @Param('userId') userId: string,
    @Body('durationHours') durationHours?: number,
  ) {
    return this.adminService.chatBanUser(userId, durationHours);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Delete('users/:userId/chat-ban')
  async chatUnbanUser(@Param('userId') userId: string) {
    return this.adminService.chatUnbanUser(userId);
  }

  // ─── Maintenance ──────────────────────────────────────────────────────────

  /**
   * Aboneliği olmayan veya yanlış planla eşleşmiş işletmeleri otomatik düzeltir.
   * POST /admin/maintenance/seed-subscriptions
   * Yalnız geçerli admin JWT'siyle çağrılabilir (diğer tüm admin uçları gibi).
   */
  @UseGuards(AdminJwtAuthGuard)
  @Post('maintenance/seed-subscriptions')
  async seedSubscriptions() {
    const result = await this.adminService.seedMissingSubscriptions();
    return { success: true, ...result };
  }
}
