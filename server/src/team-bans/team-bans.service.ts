import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamBan } from './team-ban.entity';

@Injectable()
export class TeamBansService {
    constructor(
        @InjectRepository(TeamBan)
        private teamBansRepository: Repository<TeamBan>,
    ) { }

    async isBanned(teamId: string, userId: string): Promise<boolean> {
        const ban = await this.teamBansRepository.findOne({ where: { teamId, userId } });
        return !!ban;
    }

    async banPlayer(teamId: string, userId: string): Promise<void> {
        const existing = await this.teamBansRepository.findOne({ where: { teamId, userId } });
        if (!existing) {
            await this.teamBansRepository.save(this.teamBansRepository.create({ teamId, userId }));
        }
    }

    async unbanPlayer(teamId: string, userId: string): Promise<void> {
        await this.teamBansRepository.delete({ teamId, userId });
    }
}
