import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';

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

    async update(id: string, updateUserDto: any): Promise<User | null> {
        await this.usersRepository.update(id, updateUserDto);
        return this.usersRepository.findOne({ where: { id } });
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
