import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBlock } from './user-block.entity';

@Injectable()
export class UserBlocksService {
    constructor(
        @InjectRepository(UserBlock)
        private userBlockRepository: Repository<UserBlock>,
    ) {}

    async blockUser(blockerId: string, blockedId: string): Promise<void> {
        if (blockerId === blockedId) {
            throw new BadRequestException('Kendinizi engelleyemezsiniz.');
        }
        const existing = await this.userBlockRepository.findOne({
            where: { blockerId, blockedId },
        });
        if (existing) return;
        await this.userBlockRepository.save(
            this.userBlockRepository.create({ blockerId, blockedId }),
        );
    }

    async unblockUser(blockerId: string, blockedId: string): Promise<void> {
        await this.userBlockRepository.delete({ blockerId, blockedId });
    }

    async getBlockedUserIds(blockerId: string): Promise<string[]> {
        const blocks = await this.userBlockRepository.find({
            where: { blockerId },
            select: ['blockedId'],
        });
        return blocks.map(b => b.blockedId);
    }

    async getBlockedUsers(blockerId: string) {
        const blocks = await this.userBlockRepository.find({
            where: { blockerId },
            relations: ['blocked'],
        });
        return blocks
            .filter(b => b.blocked)
            .map(b => ({
                id: b.blocked.id,
                username: b.blocked.username,
                full_name: b.blocked.full_name,
                avatarUrl: b.blocked.avatarUrl ?? null,
            }));
    }

    async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
        const count = await this.userBlockRepository.count({
            where: { blockerId, blockedId },
        });
        return count > 0;
    }
}
