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

@Controller('pitches')
export class PitchChangeRequestsController {
  constructor(private readonly service: PitchChangeRequestsService) {}

  // GÜVENLİK: guard'lı; işletme sahibi token'dan (req.user.id) türetilir ve
  // sahanın gerçek sahibi olduğu doğrulanır. body'deki businessId kaldırıldı
  // (güvenilmezdi — sahiplik saha→işletme yolundan çözülür).
  @UseGuards(JwtAuthGuard)
  @Post(':pitchId/change-requests')
  async createRequest(
    @Param('pitchId') pitchId: string,
    @Request() req: { user: Express.User },
    @Body()
    body: {
      type: 'CUSTOM_FACILITY' | 'PHOTO_UPDATE';
      requestedData: PitchChangeData;
    },
  ) {
    return this.service.createRequest(
      pitchId,
      req.user.id,
      body.type,
      body.requestedData,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':pitchId/change-requests/pending')
  async getPending(
    @Param('pitchId') pitchId: string,
    @Request() req: { user: Express.User },
  ) {
    return this.service.getPendingForPitch(pitchId, req.user.id);
  }
}
