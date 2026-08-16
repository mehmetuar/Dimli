import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppGateway } from './app.gateway';
import { TypingService } from './typing.service';
import { ChatParticipant } from '../chat/chat-participant.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'SECRET_KEY',
    }),
    // Yalnız entity repository'leri — ChatModule/UsersModule import EDİLMEZ.
    // Bağımlılık yönü chat → gateway olarak kalır; forwardRef gerekmez (§88).
    TypeOrmModule.forFeature([ChatParticipant, User]),
  ],
  providers: [AppGateway, TypingService],
  exports: [AppGateway],
})
export class GatewayModule {}
