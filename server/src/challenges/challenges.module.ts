import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { ChallengesService } from './challenges.service';
import { ChallengesController } from './challenges.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Challenge])],
    controllers: [ChallengesController],
    providers: [ChallengesService],
    exports: [ChallengesService],
})
export class ChallengesModule { }
