import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PresetNotesService } from './preset-notes.service';
import { CreatePresetNoteDto } from './dto/create-preset-note.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Tüm uçlar owner-JWT korumalı; businessId server'da req.user.id'den türetilir
// (client güvenilmez şekilde işletme kimliği gönderemez).
@UseGuards(JwtAuthGuard)
@Controller('preset-notes')
export class PresetNotesController {
  constructor(private readonly presetNotesService: PresetNotesService) {}

  @Get()
  findAll(@Request() req: { user: Express.User }) {
    return this.presetNotesService.findForOwner(req.user.id);
  }

  @Post()
  create(
    @Request() req: { user: Express.User },
    @Body() dto: CreatePresetNoteDto,
  ) {
    return this.presetNotesService.create(req.user.id, dto.content);
  }

  @Patch(':id')
  update(
    @Request() req: { user: Express.User },
    @Param('id') id: string,
    @Body() dto: CreatePresetNoteDto,
  ) {
    return this.presetNotesService.update(req.user.id, id, dto.content);
  }

  @Delete(':id')
  remove(@Request() req: { user: Express.User }, @Param('id') id: string) {
    return this.presetNotesService.remove(req.user.id, id);
  }
}
