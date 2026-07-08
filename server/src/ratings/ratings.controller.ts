import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('pending')
  getPending(@Request() req: { user: Express.User }) {
    return this.ratingsService.getPendingRatings(req.user.id);
  }

  // limit YOKSA eski sözleşme (düz dizi) — sahadaki kurulu sürümler bozulmasın.
  // limit VARSA sayfalı {items,total,hasMore} (cap: business.controller ile aynı).
  @UseGuards(JwtAuthGuard)
  @Get('history')
  getHistory(
    @Request() req: { user: Express.User },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (limit === undefined) {
      return this.ratingsService.getMatchHistory(req.user.id);
    }
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const safeOffset = Math.max(parseInt(offset ?? '0', 10) || 0, 0);
    return this.ratingsService.getMatchHistoryPaged(
      req.user.id,
      safeLimit,
      safeOffset,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('joker-history')
  getJokerHistory(@Request() req: { user: Express.User }) {
    return this.ratingsService.getJokerMatchHistory(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  submit(@Request() req: { user: Express.User }, @Body() dto: CreateRatingDto) {
    return this.ratingsService.submitRating(req.user.id, dto);
  }
}
