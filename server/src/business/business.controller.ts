import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { requireGeoFilter } from '../common/validate-geo.util';

@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  create(@Body() createBusinessDto: any) {
    return this.businessService.create(createBusinessDto);
  }

  @Get()
  findAll(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Query('ids') ids?: string,
  ) {
    // ids: belirli işletmeleri konum kısıtlaması olmadan ID üzerinden çekmek
    // için (zaten ID'si bilinen bir kaynağı çekmek "tüm şehirleri tara" değildir).
    if (ids) {
      return this.businessService.findAll({
        ids: ids.split(',').filter(Boolean),
      });
    }
    return this.businessService.findAll({
      geoFilter: requireGeoFilter(lat, lng, radius),
    });
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
