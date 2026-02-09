import { Controller, Get, Post, Body, Param } from '@nestjs/common';
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
}
