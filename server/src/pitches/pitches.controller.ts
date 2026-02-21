import { Controller, Get, Post, Body, Param, Patch, Delete, Put } from '@nestjs/common';
import { PitchesService } from './pitches.service';

@Controller('pitches')
export class PitchesController {
    constructor(private readonly pitchesService: PitchesService) { }

    @Post()
    create(@Body() createPitchDto: any) {
        return this.pitchesService.create(createPitchDto);
    }

    @Get()
    findAll() {
        return this.pitchesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.pitchesService.findOne(id);
    }

    @Get('business/:businessId')
    findByBusiness(@Param('businessId') businessId: string) {
        return this.pitchesService.findByBusiness(businessId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePitchDto: any) {
        return this.pitchesService.update(id, updatePitchDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.pitchesService.remove(id);
    }

    // ===== TIME SLOT ENDPOINTS =====

    @Put(':id/time-slots')
    setTimeSlots(@Param('id') id: string, @Body() body: { slots: { startTime: string; endTime: string }[] }) {
        return this.pitchesService.setTimeSlots(id, body.slots);
    }

    @Get(':id/time-slots')
    getTimeSlots(@Param('id') id: string) {
        return this.pitchesService.getTimeSlots(id);
    }
}

