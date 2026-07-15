import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromoCode } from './entities/promo-code.entity';
import { PromoCodeRedemption } from './entities/promo-code-redemption.entity';
import { PromoCodesController } from './promo-codes.controller';
import { PromoCodesService } from './promo-codes.service';
import { SubscriptionModule } from '../subscription/subscription.module';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';

// SubscriptionModule (yaprak) import edilir — yaprak kural yalnız
// SubscriptionModule'ün başka feature modül import ETMEMESİ demek; onu import
// etmek serbest. Import zinciri: Auth/Admin → PromoCodes → Subscription.
@Module({
  imports: [
    TypeOrmModule.forFeature([PromoCode, PromoCodeRedemption, BusinessOwner]),
    SubscriptionModule,
  ],
  controllers: [PromoCodesController],
  providers: [PromoCodesService],
  exports: [PromoCodesService],
})
export class PromoCodesModule {}
