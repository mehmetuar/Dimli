import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBlock } from './user-block.entity';
import { UserBlocksService } from './user-blocks.service';
import { UserBlocksController } from './user-blocks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserBlock])],
  controllers: [UserBlocksController],
  providers: [UserBlocksService],
  exports: [UserBlocksService],
})
export class UserBlocksModule {}
