import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesController } from './files.controller';
import { CloudinaryService } from './cloudinary.service';
import { Team } from '../teams/team.entity';
import { User } from '../users/user.entity';
import { Business } from '../business/entities/business.entity';
import { Pitch } from '../pitches/entities/pitch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Team, User, Business, Pitch])],
  controllers: [FilesController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class FilesModule {}
