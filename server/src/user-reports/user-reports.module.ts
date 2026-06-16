import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserReport } from './user-report.entity';
import { UserReportsService } from './user-reports.service';
import { UserReportsController } from './user-reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserReport])],
  controllers: [UserReportsController],
  providers: [UserReportsService],
  exports: [UserReportsService],
})
export class UserReportsModule {}
