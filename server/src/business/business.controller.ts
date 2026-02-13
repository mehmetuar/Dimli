import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { BusinessService } from './business.service';

@Controller('businesses')
export class BusinessController {
    constructor(private readonly businessService: BusinessService) { }

    @Post()
    create(@Body() createBusinessDto: any) {
        return this.businessService.create(createBusinessDto);
    }

    @Get()
    findAll() {
        return this.businessService.findAll();
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
