import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Facility } from './facility.entity';

const DEFAULT_FACILITY_NAMES = [
  'Aydınlatma',
  'Duş',
  'Soyunma Odası',
  'Otopark',
  'Kafeterya',
  'WiFi',
  'Tribün',
  'Yelek',
  'Eldiven',
  'Krampon Kiralama',
  'Su Satışı',
  'Servis',
  'Kamera Kaydı',
  'Ayakkabı Kiralama',
];

@Injectable()
export class FacilitiesService implements OnModuleInit {
  constructor(
    @InjectRepository(Facility)
    private readonly repo: Repository<Facility>,
  ) {}

  async onModuleInit() {
    for (const name of DEFAULT_FACILITY_NAMES) {
      const exists = await this.repo.findOne({ where: { name } });
      if (!exists) {
        await this.repo.save({ name, isDefault: true });
      }
    }
  }

  async findAll(): Promise<string[]> {
    const rows = await this.repo.find({
      where: { isActive: true },
      order: { isDefault: 'DESC', name: 'ASC' },
    });
    return rows.map((r) => r.name);
  }

  async upsertApproved(name: string): Promise<void> {
    const exists = await this.repo.findOne({ where: { name } });
    if (!exists) {
      await this.repo.save({ name, isDefault: false });
    }
  }
}
