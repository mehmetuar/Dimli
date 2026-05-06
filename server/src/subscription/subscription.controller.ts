import { Controller, Get, Post, Body, Param, Headers, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) { }

    @Get('plans')
    getPlans() {
        return this.subscriptionService.getPlans();
    }

    @Get('owner/:ownerId')
    findByOwner(@Param('ownerId') ownerId: string) {
        return this.subscriptionService.findByOwner(ownerId);
    }

    // Satın alma başarısız olduğunda veya RC webhook'u gelmediğinde frontend tarafından çağrılır
    @Post('confirm-purchase')
    async confirmPurchase(
        @Body() body: { ownerId: string; planType: string; rcCustomerId: string },
    ) {
        if (!body.ownerId || !body.planType) throw new BadRequestException('ownerId ve planType zorunludur.');
        return this.subscriptionService.confirmPurchase(body.ownerId, body.planType, body.rcCustomerId ?? '');
    }

    // RevenueCat webhook — abonelik durumu değişikliklerini dinler
    @Post('webhook/revenuecat')
    async revenuecatWebhook(
        @Body() body: any,
        @Headers('authorization') authHeader: string,
    ) {
        const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET || '';
        if (expectedSecret && authHeader !== expectedSecret) {
            throw new UnauthorizedException('Geçersiz webhook isteği.');
        }
        await this.subscriptionService.handleWebhook(body.event || body);
        return { received: true };
    }
}
