import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
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

  // Cloudinary'de `dimli/logos` klasöründe olup HİÇBİR DB kaydında referans edilmeyen
  // (yetim) görselleri bulur. Kayıt akışında yüklenip kayıt başarısız olunca / ağ
  // koptuğunda geride kalan asset'leri toplu temizlik için listeler.
  //
  // KRİTİK: referans taraması `withDeleted: true` ile yapılır — soft-delete edilmiş
  // işletme/saha görselleri KORUNUR (§56: restore edilince görsel sağlam kalmalı).
  // olderThanHours: bu eşikten YENİ görseller atlanır (devam eden kaydı vurmamak için).
  async findOrphans(olderThanHours = 24): Promise<{
    orphans: Array<{
      publicId: string;
      url: string;
      createdAt: string;
      bytes: number;
    }>;
    scanned: number;
    referenced: number;
    totalBytes: number;
  }> {
    // 1. Referanslı public_id set'i (tek turda, soft-delete DAHİL)
    const referencedPublicIds = new Set<string>();
    const addRefs = (urls: Array<string | null>) => {
      for (const url of urls) {
        if (!url || !url.includes('cloudinary.com')) continue;
        const pid = this.extractPublicId(url);
        if (pid) referencedPublicIds.add(pid);
      }
    };

    const cloudinaryFilter = ILike('%cloudinary.com%');
    const [teams, users, bizCovers, bizLogos, pitches] = await Promise.all([
      this.teamRepository.find({
        select: { logoUrl: true },
        where: { logoUrl: cloudinaryFilter },
        withDeleted: true,
      }),
      this.userRepository.find({
        select: { avatarUrl: true },
        where: { avatarUrl: cloudinaryFilter },
        withDeleted: true,
      }),
      this.businessRepository.find({
        select: { coverImageUrl: true },
        where: { coverImageUrl: cloudinaryFilter },
        withDeleted: true,
      }),
      this.businessRepository.find({
        select: { logoUrl: true },
        where: { logoUrl: cloudinaryFilter },
        withDeleted: true,
      }),
      this.pitchRepository.find({
        select: { imageUrl: true },
        where: { imageUrl: cloudinaryFilter },
        withDeleted: true,
      }),
    ]);
    addRefs(teams.map((t) => t.logoUrl ?? null));
    addRefs(users.map((u) => u.avatarUrl ?? null));
    addRefs(bizCovers.map((b) => b.coverImageUrl ?? null));
    addRefs(bizLogos.map((b) => b.logoUrl ?? null));
    addRefs(pitches.map((p) => p.imageUrl ?? null));

    // 2. Cloudinary `dimli/logos` klasörünü sayfalı gez
    const cutoffMs = Date.now() - olderThanHours * 60 * 60 * 1000;
    const orphans: Array<{
      publicId: string;
      url: string;
      createdAt: string;
      bytes: number;
    }> = [];
    let scanned = 0;
    let totalBytes = 0;
    let nextCursor: string | undefined;

    do {
      const res: {
        resources: Array<{
          public_id: string;
          secure_url: string;
          created_at: string;
          bytes: number;
        }>;
        next_cursor?: string;
      } = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'dimli/logos',
        max_results: 500,
        next_cursor: nextCursor,
      });

      for (const r of res.resources) {
        scanned++;
        // 3. Yetim ⇔ referans set'inde YOK ve eşikten ESKİ
        if (referencedPublicIds.has(r.public_id)) continue;
        if (new Date(r.created_at).getTime() >= cutoffMs) continue;
        orphans.push({
          publicId: r.public_id,
          url: r.secure_url,
          createdAt: r.created_at,
          bytes: r.bytes ?? 0,
        });
        totalBytes += r.bytes ?? 0;
      }
      nextCursor = res.next_cursor;
    } while (nextCursor);

    return {
      orphans,
      scanned,
      referenced: referencedPublicIds.size,
      totalBytes,
    };
  }

  // Toplu yetim silme. Güvenlik ağı: yalnız `dimli/logos/` önekli public_id'ler kabul
  // edilir (yanlış klasöre dokunmayı engeller). 100'lük partiler halinde siler
  // (Cloudinary delete_resources sınırı).
  async deleteOrphans(
    publicIds: string[],
  ): Promise<{ deleted: string[]; skipped: string[] }> {
    const valid = publicIds.filter((id) => id.startsWith('dimli/logos/'));
    const skipped = publicIds.filter((id) => !id.startsWith('dimli/logos/'));
    const deleted: string[] = [];

    for (let i = 0; i < valid.length; i += 100) {
      const batch = valid.slice(i, i + 100);
      try {
        const res: { deleted?: Record<string, string> } =
          await cloudinary.api.delete_resources(batch);
        for (const id of batch) {
          if (res.deleted?.[id] === 'deleted') deleted.push(id);
          else skipped.push(id);
        }
      } catch (err) {
        console.error('Cloudinary deleteOrphans error:', err);
        skipped.push(...batch);
      }
    }
    return { deleted, skipped };
  }
}
