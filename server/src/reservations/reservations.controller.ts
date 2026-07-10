import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { istanbulNaiveStringToUtc } from '../common/turkey-time.util';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// GÜVENLİK: bu controller eskiden TAMAMEN guard'sızdı ve sahiplik/kimliği body'deki
// teamId/userId'ye güveniyordu (herkes herhangi bir rezervasyonu onaylayıp/iptal
// edebiliyordu). Artık her uç @UseGuards(JwtAuthGuard) taşır ve kimlik JWT'den
// (req.user.id) alınır; body/query teamId/userId YOK SAYILIR. Yayındaki istemci
// zaten token'ın türeteceği değeri gönderiyordu → davranış değişmez, IDOR kapanır.
// Ölü uçlar (POST / create, GET / findAll, GET /my-team) kaldırıldı — istemci
// çağırmıyordu ve public create herkesin sahte rezervasyon üretmesine izin veriyordu.
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // ─── İşletme (owner) uçları — sahiplik pitch→business→owner ile doğrulanır ──────

  @UseGuards(JwtAuthGuard)
  @Post('manual-fill')
  manualFill(
    @Request() req: { user: Express.User },
    @Body() body: { pitchId: string; slotTime: string },
  ) {
    return this.reservationsService.manualFill(
      body.pitchId,
      req.user.id,
      istanbulNaiveStringToUtc(body.slotTime),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('recurring-closures')
  createRecurringClosure(
    @Request() req: { user: Express.User },
    @Body()
    body: {
      pitchId: string;
      slotTime: string;
      startTime: string;
      endTime: string;
    },
  ) {
    return this.reservationsService.createRecurringClosure(
      body.pitchId,
      req.user.id,
      istanbulNaiveStringToUtc(body.slotTime),
      body.startTime,
      body.endTime,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('recurring-closures/pitch/:pitchId')
  findRecurringClosuresByPitch(
    @Param('pitchId') pitchId: string,
    @Request() req: { user: Express.User },
  ) {
    return this.reservationsService.findRecurringClosuresByPitch(
      pitchId,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('recurring-closures/:id')
  removeRecurringClosure(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
  ) {
    return this.reservationsService.removeRecurringClosure(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
    @Body() body: { note?: string },
  ) {
    return this.reservationsService.approve(id, req.user.id, body?.note);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reject')
  reject(@Param('id') id: string, @Request() req: { user: Express.User }) {
    return this.reservationsService.rejectByBusiness(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/business-note')
  sendBusinessNote(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
    @Body() body: { note: string },
  ) {
    return this.reservationsService.sendBusinessNote(
      id,
      req.user.id,
      body.note,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/revoke')
  revoke(@Param('id') id: string, @Request() req: { user: Express.User }) {
    return this.reservationsService.revokeConfirmation(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/accept-cancel-request')
  acceptCancelRequest(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
  ) {
    return this.reservationsService.acceptCancelRequest(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reject-cancel-request')
  rejectCancelRequest(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
  ) {
    return this.reservationsService.rejectCancelRequest(id, req.user.id);
  }

  // ─── Müşteri (kaptan) uçları — takım/kullanıcı token'dan türetilir ──────────────

  // Müsaitlik ızgarası: giriş yapmış HERKES görebilir (owner'a kısıtlanmaz).
  @UseGuards(JwtAuthGuard)
  @Get('pitch/:id')
  findByPitchAndDate(
    @Param('id') pitchId: string,
    @Query('date') date: string,
  ) {
    return this.reservationsService.findByPitchAndDateRange(pitchId, date);
  }

  @UseGuards(JwtAuthGuard)
  @Get('upcoming')
  findUpcoming(@Request() req: { user: Express.User }) {
    return this.reservationsService.findUpcomingForUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Request() req: { user: Express.User }) {
    return this.reservationsService.cancel(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/propose-time')
  proposeTime(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
    @Body() body: { newSlotTime: string },
  ) {
    return this.reservationsService.proposeTime(
      id,
      req.user.id,
      new Date(body.newSlotTime),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/accept-proposal')
  acceptProposal(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
  ) {
    return this.reservationsService.acceptProposal(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/request-cancel')
  requestCancel(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
  ) {
    return this.reservationsService.requestCancel(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/undo-cancel-request')
  undoCancelRequest(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
  ) {
    return this.reservationsService.undoCancelRequest(id, req.user.id);
  }
}
