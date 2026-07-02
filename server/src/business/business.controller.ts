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
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sort') sort?: string,
  ) {
    // ids: belirli işletmeleri konum kısıtlaması olmadan ID üzerinden çekmek
    // için (zaten ID'si bilinen bir kaynağı çekmek "tüm şehirleri tara" değildir).
    if (ids) {
      return this.businessService.findAll({
        ids: ids.split(',').filter(Boolean),
      });
    }
    const geoFilter = requireGeoFilter(lat, lng, radius);
    // Sayfalı (hafif) yol — yalnız limit verildiğinde; müşteri Sahalar listesi.
    // limit yoksa legacy tam-liste yolu korunur (diğer tüketiciler bozulmaz).
    if (limit !== undefined) {
      const allowed = [
        'distance',
        'price_asc',
        'price_desc',
        'rating',
        'rating_count',
      ];
      const safeSort = allowed.includes(sort ?? '') ? sort! : 'distance';
      return this.businessService.findNearbyPaged({
        geoFilter,
        limit: Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50),
        offset: Math.max(parseInt(offset ?? '0', 10) || 0, 0),
        sort: safeSort as
          | 'distance'
          | 'price_asc'
          | 'price_desc'
          | 'rating'
          | 'rating_count',
      });
    }
    return this.businessService.findAll({ geoFilter });
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
