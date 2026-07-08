import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CloudinaryService } from './cloudinary.service';

// Cloudinary config CloudinaryService constructor'ında yapılır (tek nokta); global singleton
// olduğu için buradaki upload_stream de aynı config'i kullanır.
function uploadToCloudinary(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: 'dimli/logos',
        resource_type: 'image',
        transformation: [
          { width: 1280, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error || !result)
          return reject(error ?? new Error('Upload failed'));
        resolve(result.secure_url);
      },
    );
    Readable.from(buffer).pipe(upload);
  });
}

@Controller('files')
export class FilesController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Sadece görsel dosyalar yüklenebilir'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');
    try {
      const url = await uploadToCloudinary(file.buffer);
      return { url };
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      throw new InternalServerErrorException('Görsel yüklenemedi');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('delete-cloud')
  async deleteCloudFile(@Body('url') url: string) {
    if (!url) throw new BadRequestException('URL gerekli');
    await this.cloudinaryService.destroy(url);
    return { success: true };
  }
}
