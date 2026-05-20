import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { UserReportsService } from './user-reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserReportsController {
    constructor(private readonly userReportsService: UserReportsService) {}

    @Post('report')
    async createReport(
        @Body() body: { reportedUserId: string; messageId?: string; channelId?: string; note?: string },
        @Request() req,
    ) {
        await this.userReportsService.createReport(
            req.user.id,
            body.reportedUserId,
            body.messageId,
            body.channelId,
            body.note,
        );
        return { success: true };
    }
}
