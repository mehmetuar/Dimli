import { Injectable } from '@nestjs/common';
import { CloudinaryService } from '../../files/cloudinary.service';

// Admin bakım işlemleri: Cloudinary'de hiçbir DB kaydına bağlı olmayan yetim
// görsellerin taranması (dry-run) ve onaylı toplu silinmesi. Yetimlerin kaynağı
// çoğunlukla başarısız/yarım kalan işletme kayıtlarıdır (§56 devamı).
@Injectable()
export class AdminMaintenanceService {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  // Dry-run: siler değil, yalnız yetim listesi + özet döner.
  async scanOrphanImages(olderThanHours = 24) {
    const { orphans, scanned, referenced, totalBytes } =
      await this.cloudinaryService.findOrphans(olderThanHours);
    return {
      orphans,
      summary: {
        orphanCount: orphans.length,
        scanned,
        referenced,
        totalBytes,
        olderThanHours,
      },
    };
  }

  // Onaylı toplu silme — publicIds raporlanan (dry-run) set'inden gelir.
  async cleanupOrphanImages(publicIds: string[]) {
    const { deleted, skipped } =
      await this.cloudinaryService.deleteOrphans(publicIds);
    return {
      deletedCount: deleted.length,
      skippedCount: skipped.length,
      deleted,
      skipped,
    };
  }
}
