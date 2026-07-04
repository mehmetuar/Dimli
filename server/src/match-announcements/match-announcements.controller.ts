import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  MatchAnnouncementsService,
  MarketplaceSort,
} from './match-announcements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { requireGeoFilter } from '../common/validate-geo.util';

@Controller('match-announcements')
export class MatchAnnouncementsController {
  constructor(
    private readonly matchAnnouncementsService: MatchAnnouncementsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createDto: Parameters<MatchAnnouncementsService['create']>[0],
    @Request() req: { user: Express.User },
  ) {
    return this.matchAnnouncementsService.create(createDto, req.user.id);
  }

  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('pitchId') pitchId?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('paged') paged?: string,
  ) {
    // Sıralama whitelist'i (business.controller deseni) — bilinmeyen değer
    // sessizce distance'a düşer, eski istemciler etkilenmez.
    const allowed: MarketplaceSort[] = [
      'distance',
      'date_desc',
      'date_asc',
      'price_asc',
      'price_desc',
      'fair_play',
    ];
    const safeSort = allowed.includes(sort as MarketplaceSort)
      ? (sort as MarketplaceSort)
      : 'distance';
    return this.matchAnnouncementsService.findAll({
      date,
      pitchId,
      offset: offset ? parseInt(offset, 10) : 0,
      limit: limit ? parseInt(limit, 10) : 50,
      sort: safeSort,
      // paged=1 → { items, total, hasMore } zarfı; yoksa düz dizi
      // (deploy edilmiş eski uygulamalar düz diziyi tüketiyor).
      paged: paged === '1' || paged === 'true',
      geoFilter: requireGeoFilter(lat, lng, radius),
    });
  }

  @Get('pitch/:pitchId')
  findByPitch(@Param('pitchId') pitchId: string) {
    return this.matchAnnouncementsService.findByPitch(pitchId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: { user: Express.User }) {
    return this.matchAnnouncementsService.delete(id, req.user.id);
  }
}
