import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Challenge } from './challenge.entity';

@Injectable()
export class ChallengesService {
    constructor(
        @InjectRepository(Challenge)
        private challengesRepository: Repository<Challenge>,
    ) { }

    async create(fromTeamId: string, toMatchId: string, note?: string): Promise<Challenge> {
        const challenge = this.challengesRepository.create({
            fromTeamId,
            toMatchId,
            note,
            status: 'PENDING',
        });
        return this.challengesRepository.save(challenge);
    }

    async findByMatchId(matchId: string): Promise<Challenge[]> {
        return this.challengesRepository.find({
            where: { toMatchId: matchId },
            order: { createdAt: 'DESC' },
        });
    }

    async updateStatus(id: string, status: 'ACCEPTED' | 'REJECTED'): Promise<Challenge> {
        await this.challengesRepository.update(id, { status });
        const challenge = await this.challengesRepository.findOne({ where: { id } });
        if (!challenge) {
            throw new Error('Challenge not found');
        }
        return challenge;
    }
}
