import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser } from './entities/admin-user.entity';
import type { JwtPayload } from '../auth/types';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    @InjectRepository(AdminUser)
    private adminUserRepository: Repository<AdminUser>,
  ) {
    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      throw new Error(
        'ADMIN_JWT_SECRET ortam değişkeni tanımlı değil. Uygulama başlatılamaz.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.role !== 'admin') {
      throw new UnauthorizedException('Admin yetkisi gerekli.');
    }
    const admin = await this.adminUserRepository.findOne({
      where: { id: payload.sub },
    });
    if (!admin) {
      throw new UnauthorizedException('Admin bulunamadı.');
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      adminRole: payload.adminRole,
    };
  }
}
