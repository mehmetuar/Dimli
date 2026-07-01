import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PitchChangeRequestsService } from './pitch-change-requests.service';
import type { PitchChangeData } from '../pitches/entities/pitch-change-request.entity';

@Controller('pitches')
export class PitchChangeRequestsController {
  constructor(private readonly service: PitchChangeRequestsService) {}

  @Post(':pitchId/change-requests')
  async createRequest(
    @Param('pitchId') pitchId: string,
    @Body()
    body: {
      businessId: string;
      type: 'CUSTOM_FACILITY' | 'PHOTO_UPDATE';
      requestedData: PitchChangeData;
    },
  ) {
    return this.service.createRequest(
      pitchId,
      body.businessId,
      body.type,
      body.requestedData,
    );
  }

  @Get(':pitchId/change-requests/pending')
  async getPending(@Param('pitchId') pitchId: string) {
    return this.service.getPendingForPitch(pitchId);
  }
}
