import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { BusinessOwnerModule } from '../business-owner/business-owner.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpCode } from './entities/otp-code.entity';
import { SmsModule } from '../sms/sms.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    UsersModule,
    BusinessOwnerModule,
    PassportModule,
    SmsModule,
    SubscriptionModule,
    TypeOrmModule.forFeature([OtpCode]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'SECRET_KEY',
      signOptions: { expiresIn: '365d' },
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule { }
