import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    async create(userData: Partial<User>): Promise<User> {
        if (!userData.password) {
            throw new Error('Password is required');
        }
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const newUser = this.usersRepository.create({
            ...userData,
            password: hashedPassword,
        });
        return this.usersRepository.save(newUser);
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
}
