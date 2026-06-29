import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresetNotesService } from './preset-notes.service';
import { PresetNotesController } from './preset-notes.controller';
import { PresetNote } from './entities/preset-note.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PresetNote, BusinessOwner])],
  controllers: [PresetNotesController],
  providers: [PresetNotesService],
})
export class PresetNotesModule {}
