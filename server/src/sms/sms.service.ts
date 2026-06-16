import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendSms(phone: string, message: string): Promise<void> {
    const userCode = process.env.NETGSM_USER_CODE;
    const password = process.env.NETGSM_PASSWORD;
    const header = process.env.NETGSM_HEADER; // Gönderen olarak direkt numara görünecek

    if (!userCode || !password || !header) {
      this.logger.warn(
        `NETGSM credentials eksik (USER_CODE, PASSWORD, HEADER zorunlu). SMS gönderilmedi. Kod: ${message}`,
      );
      return;
    }

    const normalizedPhone = this.normalizePhone(phone);

    try {
      const authHeader = Buffer.from(`${userCode}:${password}`).toString(
        'base64',
      );

      const response = await axios.post(
        'https://api.netgsm.com.tr/sms/rest/v2/otp',
        {
          msgheader: header,
          msg: message,
          no: normalizedPhone,
        },
        {
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const responseData = response.data;

      if (responseData.code !== '00') {
        throw new Error(
          `NetGSM hata kodu: ${responseData.code} - ${responseData.description || 'Bilinmeyen hata'}`,
        );
      }

      this.logger.log(
        `OTP SMS gönderildi: ${normalizedPhone} (Job ID: ${responseData.jobid})`,
      );
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.description ||
        error?.response?.data?.code ||
        error.message;
      this.logger.error(`SMS gönderilemedi: ${errorMessage}`);
      throw new Error('SMS gönderilemedi. Lütfen daha sonra tekrar deneyin.');
    }
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    // OTP API'si genellikle başında sıfır olmadan 10 haneli format ister: 537XXXXXXX
    if (digits.startsWith('0')) return digits.slice(1);
    if (digits.startsWith('90')) return digits.slice(2);
    return digits;
  }
}
