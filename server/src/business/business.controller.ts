import {
  Controller,
  Get,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { requireGeoFilter } from '../common/validate-geo.util';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

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

  // Yalnız işletmenin sahibi kendi işletmesini güncelleyebilir (JWT'den çözülür);
  // gövde UpdateBusinessDto whitelist'iyle sınırlıdır (status vb. hassas alanlar geçmez).
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBusinessDto,
    @Request() req: { user: Express.User },
  ) {
    return this.businessService.update(id, updateDto, req.user.id);
  }
}
