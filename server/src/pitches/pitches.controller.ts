import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Put,
} from '@nestjs/common';
import { PitchesService } from './pitches.service';

@Controller('pitches')
export class PitchesController {
  constructor(private readonly pitchesService: PitchesService) {}

  @Post()
  create(@Body() createPitchDto: any) {
    return this.pitchesService.create(createPitchDto);
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

  @Patch(':id/status')
  toggleStatus(@Param('id') id: string) {
    return this.pitchesService.toggleStatus(id);
  }

  @Patch(':id/closed-days')
  updateClosedDays(
    @Param('id') id: string,
    @Body() body: { closedDays: string[] },
  ) {
    return this.pitchesService.updateClosedDays(id, body.closedDays);
  }

  // ===== TIME SLOT ENDPOINTS — must be before @Get(':id') =====

  @Put(':id/time-slots')
  setTimeSlots(
    @Param('id') id: string,
    @Body() body: { slots: { startTime: string; endTime: string }[] },
  ) {
    return this.pitchesService.setTimeSlots(id, body.slots);
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePitchDto: any) {
    return this.pitchesService.update(id, updatePitchDto);
  }

  // Reddedilen sahanın bilgilerini güncelleyip yeniden admin onayına gönderir
  @Patch(':id/resubmit')
  resubmit(@Param('id') id: string, @Body() updatePitchDto: any) {
    return this.pitchesService.resubmit(id, updatePitchDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pitchesService.remove(id);
  }
}
