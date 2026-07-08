import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChallengesService } from './challenges.service';

@UseGuards(JwtAuthGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Post()
  async create(
    @Body() dto: { toMatchId: string; note?: string },
    @Request() req: { user: { id: string } },
  ) {
    return this.challengesService.create(req.user.id, dto.toMatchId, dto.note);
  }

  @Get('match/:matchId')
  async getByMatch(@Param('matchId') matchId: string) {
    return this.challengesService.findByMatchId(matchId);
  }

  @Patch(':id/accept')
  async accept(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.challengesService.updateStatus(id, 'ACCEPTED', req.user.id);
  }

  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.challengesService.updateStatus(id, 'REJECTED', req.user.id);
  }

  @Get('team/:teamId')
  async getByTeam(@Param('teamId') teamId: string) {
    return this.challengesService.findByTeamId(teamId);
  }

  // Takım İstekleri ekranı: zengin + yalnız GELECEK maçlara giden meydan okumalar
  @Get('team/:teamId/active')
  async getActiveOutgoing(@Param('teamId') teamId: string) {
    return this.challengesService.findActiveOutgoingByTeamId(teamId);
  }

  @Get('team/:teamId/incoming')
  async getIncomingByTeam(@Param('teamId') teamId: string) {
    return this.challengesService.findIncomingByTeamId(teamId);
  }

  // İptal (geri çek): yalnız fromTeam'in kaptanı/yardımcı kaptanı (service'te doğrulanır)
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.challengesService.delete(id, req.user.id);
  }
}
