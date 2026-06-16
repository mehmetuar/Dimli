import {
  Controller,
  Get,
  Post,
  Body,
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

  @UseGuards(JwtAuthGuard)
  @Get('history')
  getHistory(@Request() req: { user: Express.User }) {
    return this.ratingsService.getMatchHistory(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  submit(@Request() req: { user: Express.User }, @Body() dto: CreateRatingDto) {
    return this.ratingsService.submitRating(req.user.id, dto);
  }
}
