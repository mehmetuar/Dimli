import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { BusinessService } from './business.service';

@Controller('businesses')
export class BusinessController {
    constructor(private readonly businessService: BusinessService) { }

    @Post()
    create(@Body() createBusinessDto: any) {
        return this.businessService.create(createBusinessDto);
    }

    @Get()
    findAll(
        @Query('lat') lat?: string,
        @Query('lng') lng?: string,
        @Query('radius') radius?: string,
    ) {
        const geoFilter = lat && lng
            ? { lat: parseFloat(lat), lng: parseFloat(lng), radius: radius ? parseFloat(radius) : 20 }
            : undefined;
        return this.businessService.findAll(geoFilter);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.businessService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: any) {
        return this.businessService.update(id, updateDto);
    }
}
