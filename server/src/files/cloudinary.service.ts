import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v2 as cloudinary } from 'cloudinary';
import { Team } from '../teams/team.entity';
import { User } from '../users/user.entity';
import { Business } from '../business/entities/business.entity';
import { Pitch } from '../pitches/entities/pitch.entity';

// Tek Cloudinary erişim noktası: config + public_id çıkarma + koşulsuz/referans-sayımlı silme.
// safeDestroy, aynı görselin birden çok kayıtta paylaşılabilmesi (ör. işletme kapağı == saha
// fotoğrafı, ya da kullanıcının aynı görseli hem avatar hem takım logosu yapması) durumunda
// başka kayıtları kırmamak için resmi yalnız hiçbir yerde referans kalmadıysa siler.
@Injectable()
export class CloudinaryService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(Pitch)
    private readonly pitchRepository: Repository<Pitch>,
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  // https://res.cloudinary.com/cloud/image/upload/v123/dimli/logos/abc.jpg → dimli/logos/abc
  extractPublicId(url: string): string | null {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match ? match[1] : null;
  }

  // Koşulsuz silme — çağıran, URL'nin başka yerde kullanılmadığından emin olduğunda kullanır
  // (ör. foto değiştir/kaldır: eski URL zaten yeni değerle DB'den düşmüştür).
  async destroy(url: string | null | undefined): Promise<void> {
    if (!url || !url.includes('cloudinary.com')) return;
    const publicId = this.extractPublicId(url);
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error('Cloudinary destroy error:', err);
    }
  }

  // Referans-sayımlı silme — URL herhangi bir takım/kullanıcı/işletme/saha kaydında hâlâ
  // geçiyorsa DOKUNMAZ. İlgili kayıt silindikten/güncellendikten SONRA çağrılmalıdır ki
  // kendi eski referansı sayıma girmesin.
  async safeDestroy(url: string | null | undefined): Promise<void> {
    if (!url || !url.includes('cloudinary.com')) return;
    const [byTeam, byUser, byBusinessCover, byBusinessLogo, byPitch] =
      await Promise.all([
        this.teamRepository.count({ where: { logoUrl: url } }),
        this.userRepository.count({ where: { avatarUrl: url } }),
        this.businessRepository.count({ where: { coverImageUrl: url } }),
        this.businessRepository.count({ where: { logoUrl: url } }),
        this.pitchRepository.count({ where: { imageUrl: url } }),
      ]);
    if (byTeam + byUser + byBusinessCover + byBusinessLogo + byPitch > 0)
      return;
    await this.destroy(url);
  }
}
