import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PitchChangeRequestsService } from './pitch-change-requests.service';
import type { PitchChangeData } from '../pitches/entities/pitch-change-request.entity';

// İşletme kapak fotoğrafı değişiklik istekleri — saha (pitches) controller'ı ile aynı
// desen, farklı prefix gerektiği için ayrı sınıf.
@Controller('businesses')
export class BusinessChangeRequestsController {
  constructor(private readonly service: PitchChangeRequestsService) {}

  @Post(':businessId/change-requests')
  async createRequest(
    @Param('businessId') businessId: string,
    @Body() body: { requestedData: PitchChangeData },
  ) {
    return this.service.createBusinessPhotoRequest(
      businessId,
      body.requestedData,
    );
  }

  @Get(':businessId/change-requests/pending')
  async getPending(@Param('businessId') businessId: string) {
    return this.service.getPendingForBusiness(businessId);
  }
}
