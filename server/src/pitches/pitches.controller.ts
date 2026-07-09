import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Put,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PitchesService } from './pitches.service';
import { PitchDowngradeService } from './pitch-downgrade.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePitchDto } from './dto/create-pitch.dto';
import { UpdatePitchDto } from './dto/update-pitch.dto';
import { ResubmitPitchDto } from './dto/resubmit-pitch.dto';
import { SetTimeSlotsDto, UpdateClosedDaysDto } from './dto/pitch-actions.dto';
import {
  DowngradePrecheckDto,
  ScheduleDowngradeDto,
} from './dto/downgrade.dto';

// Mutasyon uçları JwtAuthGuard + sahiplik kontrolüyle korunur (sahibi olmayan/kimliksiz biri
// saha oluşturamaz/düzenleyemez/silemez, approvalStatus gövdeden geçmez). GET uçları müşteri
// tarafından da kullanıldığı için açık bırakılır.
@Controller('pitches')
export class PitchesController {
  constructor(
    private readonly pitchesService: PitchesService,
    private readonly downgradeService: PitchDowngradeService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreatePitchDto, @Request() req: { user: Express.User }) {
    return this.pitchesService.create(dto, req.user.id);
  }

  // ===== PLAN DÜŞÜRME (ertelenmiş saha silme) =====

  // Saha seçim modalının "onayla" adımı — YAN ETKİSİZ doğrulama. Satın alma
  // ve asıl planlama schedule-downgrade'de; iptal edilirse hiçbir şey değişmez.
  @UseGuards(JwtAuthGuard)
  @Post('downgrade-precheck')
  downgradePrecheck(
    @Body() dto: DowngradePrecheckDto,
    @Request() req: { user: Express.User },
  ) {
    return this.downgradeService.precheckDowngrade(
      req.user.id,
      dto.planType,
      dto.pitchIds,
    );
  }

  // RevenueCat satın alma TAMAMLANDIKTAN sonra çağrılır: abonelik pending
  // alanları + seçili sahalar (pasif + X'te silinecek) tek transaction'da.
  @UseGuards(JwtAuthGuard)
  @Post('schedule-downgrade')
  scheduleDowngrade(
    @Body() dto: ScheduleDowngradeDto,
    @Request() req: { user: Express.User },
  ) {
    return this.downgradeService.scheduleDowngrade(
      req.user.id,
      dto.planType,
      dto.rcCustomerId ?? '',
      dto.pitchIds,
    );
  }

  @Get()
  findAll() {
    return this.pitchesService.findAll();
  }

  @Get('business/:businessId')
  findByBusiness(@Param('businessId') businessId: string) {
    return this.pitchesService.findByBusiness(businessId);
  }

  // ===== STATUS & CLOSED DAYS — must be before @Get(':id') / @Patch(':id') =====

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  toggleStatus(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
  ) {
    return this.pitchesService.toggleStatus(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/closed-days')
  updateClosedDays(
    @Param('id') id: string,
    @Body() body: UpdateClosedDaysDto,
    @Request() req: { user: Express.User },
  ) {
    return this.pitchesService.updateClosedDays(
      id,
      body.closedDays,
      req.user.id,
    );
  }

  // ===== TIME SLOT ENDPOINTS — must be before @Get(':id') =====

  @UseGuards(JwtAuthGuard)
  @Put(':id/time-slots')
  setTimeSlots(
    @Param('id') id: string,
    @Body() body: SetTimeSlotsDto,
    @Request() req: { user: Express.User },
  ) {
    return this.pitchesService.setTimeSlots(id, body.slots, req.user.id);
  }

  @Get(':id/time-slots')
  getTimeSlots(@Param('id') id: string) {
    return this.pitchesService.getTimeSlots(id);
  }

  // ===== GENERIC CRUD =====

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pitchesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePitchDto,
    @Request() req: { user: Express.User },
  ) {
    return this.pitchesService.update(id, dto, req.user.id);
  }

  // Reddedilen sahanın bilgilerini güncelleyip yeniden admin onayına gönderir
  @UseGuards(JwtAuthGuard)
  @Patch(':id/resubmit')
  resubmit(
    @Param('id') id: string,
    @Body() dto: ResubmitPitchDto,
    @Request() req: { user: Express.User },
  ) {
    return this.pitchesService.resubmit(id, dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: Express.User }) {
    return this.pitchesService.remove(id, req.user.id);
  }
}
