import {
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

@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    // ─── Auth ─────────────────────────────────────────────────────────────────

    @Post('auth/login')
    async login(@Body() body: { email: string; password: string }) {
        return this.adminService.login(body.email, body.password);
    }

    // ─── Applications ─────────────────────────────────────────────────────────

    @UseGuards(AdminJwtAuthGuard)
    @Get('applications')
    async getApplications(@Query('status') status?: string) {
        return this.adminService.getApplications(status);
    }

    @UseGuards(AdminJwtAuthGuard)
    @Get('applications/:businessId')
    async getApplicationDetail(@Param('businessId') businessId: string) {
        return this.adminService.getApplicationDetail(businessId);
    }

    @UseGuards(AdminJwtAuthGuard)
    @Post('applications/:businessId/approve')
    async approveApplication(@Param('businessId') businessId: string, @Request() req) {
        return this.adminService.approveApplication(businessId, req.user.id);
    }

    @UseGuards(AdminJwtAuthGuard)
    @Post('applications/:businessId/reject')
    async rejectApplication(
        @Param('businessId') businessId: string,
        @Body() body: { reason: string },
        @Request() req,
    ) {
        return this.adminService.rejectApplication(businessId, req.user.id, body.reason);
    }

    @UseGuards(AdminJwtAuthGuard)
    @Patch('applications/:businessId')
    async updateApplication(
        @Param('businessId') businessId: string,
        @Body() body: any,
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
    async getAllBusinesses(@Query('status') status?: string) {
        return this.adminService.getAllBusinesses(status);
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

    // ─── Change Requests ─────────────────────────────────────────────────────

    @UseGuards(AdminJwtAuthGuard)
    @Get('change-requests')
    async getChangeRequests(@Query('status') status?: string) {
        return this.adminService.getChangeRequests(status);
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

    // ─── User Reports ─────────────────────────────────────────────────────────

    @UseGuards(AdminJwtAuthGuard)
    @Get('reports')
    async getReports(@Query('status') status?: string) {
        return this.adminService.getReports(status as any);
    }

    @UseGuards(AdminJwtAuthGuard)
    @Patch('reports/:id/status')
    async updateReportStatus(
        @Param('id') id: string,
        @Body('status') status: string,
    ) {
        return this.adminService.updateReportStatus(id, status as any);
    }

    @UseGuards(AdminJwtAuthGuard)
    @Get('reports/pending-count')
    async getPendingReportCount() {
        return this.adminService.getPendingReportCount();
    }

    // ─── Chat Ban ─────────────────────────────────────────────────────────────

    @UseGuards(AdminJwtAuthGuard)
    @Get('users/banned')
    async getBannedUsers() {
        return this.adminService.getBannedUsers();
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
     * Body: { secret: "ADMIN_SEED_SECRET" }  (ek güvenlik katmanı)
     */
    @Post('maintenance/seed-subscriptions')
    async seedSubscriptions(@Body('secret') secret: string) {
        const expected = process.env.ADMIN_SEED_SECRET || 'dimli-seed-2026';
        if (secret !== expected) {
            return { success: false, message: 'Geçersiz secret.' };
        }
        const result = await this.adminService.seedMissingSubscriptions();
        return { success: true, ...result };
    }
}
