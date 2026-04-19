import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);

    async sendSms(phone: string, message: string): Promise<void> {
        const apiUrl = process.env.DIMLI_API_URL;
        const apiKey = process.env.DIMLI_API_KEY;
        const sender = process.env.DIMLI_SENDER || 'DIMLI';

        if (!apiUrl || !apiKey) {
            this.logger.warn(`DIMLI_API_URL veya DIMLI_API_KEY tanımlı değil. SMS gönderilmedi. Kod: ${message}`);
            return;
        }

        // Türkiye formatına çevir: 05xx -> 905xx
        const normalizedPhone = this.normalizePhone(phone);

        try {
            await axios.post(
                apiUrl,
                {
                    to: normalizedPhone,
                    message,
                    from: sender,
                },
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                },
            );
            this.logger.log(`SMS başarıyla gönderildi: ${normalizedPhone}`);
        } catch (error: any) {
            this.logger.error(`SMS gönderilemedi: ${error?.response?.data || error.message}`);
            throw new Error('SMS gönderilemedi. Lütfen daha sonra tekrar deneyin.');
        }
    }

    private normalizePhone(phone: string): string {
        const digits = phone.replace(/\D/g, '');
        if (digits.startsWith('0')) {
            return '90' + digits.slice(1);
        }
        if (digits.startsWith('90')) {
            return digits;
        }
        return '90' + digits;
    }
}
