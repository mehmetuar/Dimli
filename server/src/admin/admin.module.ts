import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { AdminUser } from './entities/admin-user.entity';
import { Business } from '../business/entities/business.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';

@Module({
    imports: [
        PassportModule,
        TypeOrmModule.forFeature([AdminUser, Business, BusinessOwner]),
        JwtModule.register({
            secret: process.env.ADMIN_JWT_SECRET || 'ADMIN_SECRET_KEY',
            signOptions: { expiresIn: '8h' },
        }),
    ],
    controllers: [AdminController],
    providers: [AdminService, AdminJwtStrategy],
    exports: [AdminService],
})
export class AdminModule { }
