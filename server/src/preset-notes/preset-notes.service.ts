import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PresetNote } from './entities/preset-note.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';

const MAX_NOTES_PER_BUSINESS = 30;
const MAX_CONTENT_LENGTH = 500;

@Injectable()
export class PresetNotesService {
  constructor(
    @InjectRepository(PresetNote)
    private presetNoteRepository: Repository<PresetNote>,
    @InjectRepository(BusinessOwner)
    private businessOwnerRepository: Repository<BusinessOwner>,
  ) {}

  // Owner JWT (req.user.id = BusinessOwner.id) → owner'ın işletme id'sini güvenle
  // çöz. businessId asla client'tan alınmaz; resubmitBusiness ile aynı desen.
  private async getOwnerBusinessId(ownerId: string): Promise<string> {
    const owner = await this.businessOwnerRepository.findOne({
      where: { id: ownerId },
      relations: ['business'],
    });
    if (!owner || !owner.business) {
      throw new NotFoundException('İşletme bulunamadı.');
    }
    return owner.business.id;
  }

  private normalizeContent(raw: string): string {
    const content = (raw ?? '').trim();
    if (!content) {
      throw new BadRequestException('Not metni boş olamaz.');
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      throw new BadRequestException(
        `Not en fazla ${MAX_CONTENT_LENGTH} karakter olabilir.`,
      );
    }
    return content;
  }

  async findForOwner(ownerId: string): Promise<PresetNote[]> {
    const businessId = await this.getOwnerBusinessId(ownerId);
    return this.presetNoteRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(ownerId: string, rawContent: string): Promise<PresetNote> {
    const businessId = await this.getOwnerBusinessId(ownerId);
    const content = this.normalizeContent(rawContent);

    const count = await this.presetNoteRepository.count({
      where: { businessId },
    });
    if (count >= MAX_NOTES_PER_BUSINESS) {
      throw new BadRequestException(
        `En fazla ${MAX_NOTES_PER_BUSINESS} hazır not ekleyebilirsiniz.`,
      );
    }

    const note = this.presetNoteRepository.create({ businessId, content });
    return this.presetNoteRepository.save(note);
  }

  async update(
    ownerId: string,
    id: string,
    rawContent: string,
  ): Promise<PresetNote> {
    const businessId = await this.getOwnerBusinessId(ownerId);
    const note = await this.presetNoteRepository.findOne({ where: { id } });
    // Sahiplik kontrolü: başka işletmenin notu varlığını sızdırmadan 404.
    if (!note || note.businessId !== businessId) {
      throw new NotFoundException('Not bulunamadı.');
    }
    note.content = this.normalizeContent(rawContent);
    return this.presetNoteRepository.save(note);
  }

  async remove(ownerId: string, id: string): Promise<{ success: boolean }> {
    const businessId = await this.getOwnerBusinessId(ownerId);
    const note = await this.presetNoteRepository.findOne({ where: { id } });
    if (!note || note.businessId !== businessId) {
      throw new NotFoundException('Not bulunamadı.');
    }
    await this.presetNoteRepository.delete(note.id);
    return { success: true };
  }
}
