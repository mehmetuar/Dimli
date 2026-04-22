import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    async create(userData: CreateUserDto): Promise<User> {
        try {
            if (!userData.password) {
                throw new Error('Password is required');
            }

            // Check if username already exists
            const existing = await this.usersRepository.findOne({ where: { username: userData.username } });
            if (existing) {
                throw new Error('Username already exists');
            }

            const hashedPassword = await bcrypt.hash(userData.password, 10);
            const newUser = this.usersRepository.create({
                ...userData,
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

    async findById(id: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { id }, relations: ['team'] });
    }

    async search(query: string): Promise<User[]> {
        return this.usersRepository.createQueryBuilder('user')
            .where('user.username ILIKE :query OR user.full_name ILIKE :query', { query: `%${query}%` })
            .getMany();
    }

    async getJokers(geoFilter?: { lat: number; lng: number; radius: number }): Promise<any[]> {
        if (!geoFilter) {
            return [];
        }

        const { lat, lng, radius } = geoFilter;

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
             ORDER BY distance_km ASC`,
            [lat, lng, radius],
        );

        if (raw.length === 0) return [];

        const ids = raw.map(r => r.id);
        const distanceMap = new Map<string, number>(
            raw.map(r => [r.id, parseFloat(Number(r.distance_km).toFixed(1))]),
        );

        const jokers = await this.usersRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.team', 'team')
            .where('user.id IN (:...ids)', { ids })
            .getMany();

        return jokers
            .map(({ password, pushToken, ...safe }) => ({
                ...safe,
                distanceKm: distanceMap.get(safe.id) ?? 0,
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm);
    }


    async update(id: string, updateUserDto: UpdateUserDto): Promise<User | null> {
        await this.usersRepository.update(id, updateUserDto);
        return this.usersRepository.findOne({ where: { id }, relations: ['team'] });
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
