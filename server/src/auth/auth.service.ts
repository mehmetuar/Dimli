import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { BusinessOwnerService } from '../business-owner/business-owner.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private businessOwnerService: BusinessOwnerService,
        private jwtService: JwtService,
    ) { }

    async validateUser(username: string, pass: string): Promise<any> {
        const user = await this.usersService.findOne(username);
        if (user && (await bcrypt.compare(pass, user.password))) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async validateBusinessOwner(email: string, pass: string): Promise<any> {
        const owner = await this.businessOwnerService.findByEmail(email);
        if (owner && (await bcrypt.compare(pass, owner.password))) {
            const { password, ...result } = owner;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = { username: user.username, sub: user.id, role: 'user' };
        return {
            access_token: this.jwtService.sign(payload),
            role: 'user'
        };
    }

    async loginBusinessOwner(owner: any) {
        const payload = { email: owner.email, sub: owner.id, role: 'business_owner', businessId: owner.business?.id };
        return {
            access_token: this.jwtService.sign(payload),
            role: 'business_owner',
            ownerId: owner.id,
            businessId: owner.business?.id
        };
    }

    async registerBusinessOwner(data: any) {
        // Hash password
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(data.password, salt);

        const newOwner = await this.businessOwnerService.create({
            ...data,
            password: hashedPassword
        });

        const { password, ...result } = newOwner;
        return result;
    }
}
