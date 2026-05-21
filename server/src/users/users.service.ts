import { Injectable, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AccountDeletion } from '../account-deletions/account-deletion.entity';
import { JoinRequest } from '../join-requests/join-request.entity';
import { Notification } from '../notifications/notification.entity';
import { Team } from '../teams/team.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(AccountDeletion)
        private accountDeletionRepository: Repository<AccountDeletion>,
        @InjectRepository(JoinRequest)
        private joinRequestRepository: Repository<JoinRequest>,
        @InjectRepository(Notification)
        private notificationRepository: Repository<Notification>,
        @InjectRepository(Team)
        private teamRepository: Repository<Team>,
    ) { }

    normalizePhone(phone: string): string {
        const cleaned = phone.replace(/\s/g, '');
        if (cleaned.startsWith('0')) return '90' + cleaned.slice(1);
        if (!cleaned.startsWith('90')) return '90' + cleaned;
        return cleaned;
    }

    async findByPhone(phone: string): Promise<User | null> {
        const normalized = this.normalizePhone(phone);
        return this.usersRepository.findOne({ where: { phone: normalized } });
    }

    async create(userData: CreateUserDto): Promise<User> {
        try {
            if (!userData.password) {
                throw new Error('Password is required');
            }

            const existing = await this.usersRepository.findOne({ where: { username: userData.username } });
            if (existing) {
                throw new Error('Username already exists');
            }

            const hashedPassword = await bcrypt.hash(userData.password, 10);
            const newUser = this.usersRepository.create({
                ...userData,
                phone: this.normalizePhone(userData.phone),
                password: hashedPassword,
                phoneVerified: true,
            });
            return await this.usersRepository.save(newUser);
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async findOne(username: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { username }, relations: ['team'] });
    }

    async isUsernameTaken(username: string, excludeId?: string): Promise<boolean> {
        const qb = this.usersRepository.createQueryBuilder('user')
            .where('user.username = :username', { username });
        if (excludeId) {
            qb.andWhere('user.id != :excludeId', { excludeId });
        }
        const user = await qb.getOne();
        return !!user;
    }

    async findById(id: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { id }, relations: ['team'] });
    }

    async search(query: string): Promise<User[]> {
        return this.usersRepository.createQueryBuilder('user')
            .where('user.username ILIKE :query OR user.full_name ILIKE :query', { query: `%${query}%` })
            .getMany();
    }

    async getJokers(geoFilter?: {
        lat?: number; lng?: number; radius?: number;
        position?: string;
        sharesFee?: boolean;
        offset?: number;
        limit?: number;
    }): Promise<{ jokers: any[]; hasMore: boolean }> {
        if (!geoFilter) return { jokers: [], hasMore: false };

        const { lat, lng, radius, position, sharesFee, offset = 0, limit = 50 } = geoFilter;
        const PAGE = Math.min(limit, 100);

        const positionMap: Record<string, string> = {
            kaleci: 'Kaleci',
            orta_saha: 'Orta Saha',
            forvet: 'Forvet',
            defans: 'Defans',
        };
        const dbPosition = position ? (positionMap[position] ?? null) : null;

        // ALL mode — koordinatsız, tüm jokerları döndür
        if (!lat || !lng) {
            const qb = this.usersRepository
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.team', 'team')
                .where('"user"."isJoker" = :isJoker', { isJoker: true });
            if (dbPosition) {
                qb.andWhere('(user.position = :pos OR user.secondaryPosition = :pos)', { pos: dbPosition });
            }
            if (sharesFee !== undefined) {
                qb.andWhere('user.sharesFee = :sharesFee', { sharesFee });
            }
            qb.skip(offset).take(PAGE + 1);
            const results = await qb.getMany();
            const hasMore = results.length > PAGE;
            const page = results.slice(0, PAGE);
            const mapped = page.map(({ password, pushToken, ...safe }: any) => ({ ...safe, distanceKm: null }));
            return { jokers: mapped, hasMore };
        }

        const params: any[] = [lat, lng, radius];
        let extraWhere = '';

        if (dbPosition) {
            params.push(dbPosition);
            extraWhere += ` AND ("position" = $${params.length} OR "secondaryPosition" = $${params.length})`;
        }
        if (sharesFee !== undefined) {
            params.push(sharesFee);
            extraWhere += ` AND "sharesFee" = $${params.length}`;
        }

        params.push(PAGE + 1); // limit+1 → hasMore tespiti
        const limitIdx = params.length;
        params.push(offset);
        const offsetIdx = params.length;

        const raw: any[] = await this.usersRepository.query(
            `SELECT id,
                (6371 * acos(
                    cos(radians($1)) * cos(radians(latitude))
                    * cos(radians(longitude) - radians($2))
                    + sin(radians($1)) * sin(radians(latitude))
                )) AS distance_km
             FROM "user"
             WHERE "isJoker" = true
               AND latitude IS NOT NULL
               AND longitude IS NOT NULL
               AND (
                   6371 * acos(
                       cos(radians($1)) * cos(radians(latitude))
                       * cos(radians(longitude) - radians($2))
                       + sin(radians($1)) * sin(radians(latitude))
                   )
               ) <= $3
               ${extraWhere}
             ORDER BY distance_km ASC
             LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
            params,
        );

        const hasMore = raw.length > PAGE;
        const page = raw.slice(0, PAGE);

        if (page.length === 0) return { jokers: [], hasMore: false };

        const ids = page.map(r => r.id);
        const distanceMap = new Map<string, number>(
            page.map(r => [r.id, parseFloat(Number(r.distance_km).toFixed(1))]),
        );

        const jokers = await this.usersRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.team', 'team')
            .where('user.id IN (:...ids)', { ids })
            .getMany();

        const mapped = jokers
            .map(({ password, pushToken, ...safe }) => ({
                ...safe,
                distanceKm: distanceMap.get(safe.id) ?? 0,
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm);

        return { jokers: mapped, hasMore };
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<User | null> {
        if (updateUserDto.username) {
            const taken = await this.isUsernameTaken(updateUserDto.username, id);
            if (taken) {
                throw new ConflictException('Bu kullanıcı adı zaten kullanılıyor.');
            }
        }
        await this.usersRepository.update(id, updateUserDto);
        return this.usersRepository.findOne({ where: { id }, relations: ['team'] });
    }

    async updatePassword(id: string, hashedPassword: string): Promise<void> {
        await this.usersRepository.update(id, { password: hashedPassword });
    }

    async updatePushToken(id: string, pushToken: string): Promise<void> {
        await this.usersRepository.update(id, { pushToken });
    }

    async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const isPasswordValid = await bcrypt.compare(changePasswordDto.oldPassword, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid old password');
        }

        const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
        await this.usersRepository.update(id, { password: hashedPassword });
    }

    async deleteAccount(userId: string, data: { reason: string; note?: string; password: string }): Promise<void> {
        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

        const isValid = await bcrypt.compare(data.password, user.password);
        if (!isValid) throw new UnauthorizedException('Şifre hatalı');

        // 1. JoinRequests sil
        await this.joinRequestRepository.delete({ userId });

        // 3. Notifications sil
        await this.notificationRepository.delete({ userId });

        // 4. ChatParticipants hard-delete (FK kısıtlaması soft-delete ile çözülmez)
        await this.usersRepository.query(
            `DELETE FROM "chat_participants_v2" WHERE "userId" = $1`,
            [userId],
        );

        // 5. ChatMessages senderId null yap (raw SQL — entity tipi union sorununu aşar)
        await this.usersRepository.query(
            `UPDATE "chat_messages" SET "senderId" = NULL WHERE "senderId" = $1`,
            [userId],
        );

        // 6. Takım kaptanlığı devret / kullanıcıyı takımdan çıkar
        const userWithTeam = await this.usersRepository.findOne({ where: { id: userId }, relations: ['team'] });
        if (userWithTeam?.team) {
            const team = await this.teamRepository.findOne({
                where: { id: userWithTeam.team.id },
                relations: ['players'],
            });
            if (team) {
                if (team.captainId === userId) {
                    const viceCaptainIds: string[] = (team.viceCaptainIds || []).filter(id => id !== userId);
                    const newCaptainId: string | null = viceCaptainIds[0]
                        ?? team.players?.find(p => p.id !== userId)?.id
                        ?? null;
                    // Raw SQL — TypeORM update() undefined değerini NULL yazmaz
                    await this.teamRepository.query(
                        `UPDATE "team" SET "captainId" = $1, "viceCaptainIds" = $2 WHERE id = $3`,
                        [newCaptainId, viceCaptainIds.filter(id => id !== newCaptainId).join(','), team.id],
                    );
                } else {
                    const cleaned = (team.viceCaptainIds || []).filter(id => id !== userId);
                    await this.teamRepository.query(
                        `UPDATE "team" SET "viceCaptainIds" = $1 WHERE id = $2`,
                        [cleaned.join(','), team.id],
                    );
                }
            }
        }

        // Team'in captain FK referansını temizle (FK_... constraint hatası önlenir)
        await this.teamRepository.query(
            `UPDATE "team" SET "captainId" = NULL WHERE "captainId" = $1`,
            [userId],
        );

        // Kullanıcıyı takımdan çıkar (user tarafındaki FK)
        await this.usersRepository.query(`UPDATE "user" SET "team_id" = NULL WHERE id = $1`, [userId]);

        // 7. Kullanıcıyı sil
        await this.usersRepository.delete(userId);

        // 8. Silme kaydını kaydet — SADECE başarılı silmeden sonra
        await this.accountDeletionRepository.save({
            reason: data.reason,
            note: data.note || null,
            userName: user.full_name,
            userEmail: user.email,
            userPhone: user.phone,
            userUsername: user.username,
        });
    }

    async seedFeet(): Promise<string> {
        const users = await this.usersRepository.find();
        let updatedCount = 0;
        for (const user of users) {
            if (!user.foot) {
                const randomFoot = Math.random() < 0.5 ? 'Sağ' : 'Sol';
                await this.usersRepository.update(user.id, { foot: randomFoot });
                updatedCount++;
            }
        }
        return `${updatedCount} users updated with random foot data.`;
    }
}
