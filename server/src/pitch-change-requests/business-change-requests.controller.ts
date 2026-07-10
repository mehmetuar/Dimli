import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PitchChangeRequestsService } from './pitch-change-requests.service';
import type { PitchChangeData } from '../pitches/entities/pitch-change-request.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// İşletme kapak fotoğrafı değişiklik istekleri — saha (pitches) controller'ı ile aynı
// desen, farklı prefix gerektiği için ayrı sınıf.
@Controller('businesses')
export class BusinessChangeRequestsController {
  constructor(private readonly service: PitchChangeRequestsService) {}

  // GÜVENLİK: guard'lı; sahibin (req.user.id) URL'deki işletmeye sahip olduğu
  // doğrulanır (IDOR kapalı).
  @UseGuards(JwtAuthGuard)
  @Post(':businessId/change-requests')
  async createRequest(
    @Param('businessId') businessId: string,
    @Request() req: { user: Express.User },
    @Body() body: { requestedData: PitchChangeData },
  ) {
    return this.service.createBusinessPhotoRequest(
      businessId,
      req.user.id,
      body.requestedData,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':businessId/change-requests/pending')
  async getPending(
    @Param('businessId') businessId: string,
    @Request() req: { user: Express.User },
  ) {
    return this.service.getPendingForBusiness(businessId, req.user.id);
  }
}
