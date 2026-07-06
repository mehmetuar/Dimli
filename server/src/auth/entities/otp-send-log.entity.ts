import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

// SMS gönderim iz kaydı — hız limitleri BU tablodan sayılır (otp_codes'tan DEĞİL).
// otp_codes satırları her yeni gönderimde silindiği için oradan yapılan sayım hiçbir
// zaman limite ulaşamıyordu. Bu tabloyu hiçbir istek yolu silmez; yalnızca
// OtpSecurityService'in gece cron'u 48 saatten eski kayıtları temizler.
@Entity('otp_send_log')
@Index(['phone', 'purpose', 'createdAt'])
@Index(['createdAt'])
export class OtpSendLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  phone: string; // normalize edilmiş 90XXXXXXXXXX

  @Column()
  purpose: string; // OtpPurpose

  @CreateDateColumn()
  createdAt: Date;
}
