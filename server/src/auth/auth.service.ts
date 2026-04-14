import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { BusinessOwnerService } from '../business-owner/business-owner.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { Business } from '../business/entities/business.entity';
import { Pitch } from '../pitches/entities/pitch.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { TimeSlot } from '../pitches/entities/time-slot.entity';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private businessOwnerService: BusinessOwnerService,
        private jwtService: JwtService,
        private dataSource: DataSource,
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

    async registerBusinessFull(data: RegisterBusinessDto) {
        const queryRunner = this.dataSource.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Create Business Owner
            // Check if email already exists
            const existingOwner = await this.businessOwnerService.findByEmail(data.owner.email);
            if (existingOwner) {
                throw new Error('Email already exists');
            }

            const salt = await bcrypt.genSalt();
            const hashedPassword = await bcrypt.hash(data.owner.password, salt);

            const businessOwner = new BusinessOwner();
            businessOwner.email = data.owner.email;
            businessOwner.password = hashedPassword;
            businessOwner.fullName = data.owner.fullName;
            if (data.owner.phone) businessOwner.phone = data.owner.phone;

            const savedOwner = await queryRunner.manager.save(businessOwner);

            // 2. Create Business
            const business = new Business();
            business.name = data.business.name;
            business.city = data.business.city;
            business.district = data.business.district;
            business.address = data.business.address;
            business.latitude = data.business.latitude;
            business.longitude = data.business.longitude;
            if (data.business.phone) business.phone = data.business.phone;
            if (data.business.openTime) business.openTime = data.business.openTime;
            if (data.business.closeTime) business.closeTime = data.business.closeTime;

            const savedBusiness = await queryRunner.manager.save(business);

            // 3. Link Owner and Business
            savedOwner.business = savedBusiness;
            await queryRunner.manager.save(savedOwner);

            // 4. Create Pitches (with optional TimeSlots)
            if (data.pitches && data.pitches.length > 0) {
                for (const pitchData of data.pitches) {
                    const pitch = new Pitch();
                    pitch.name = pitchData.name;
                    if (pitchData.type) pitch.type = pitchData.type;
                    pitch.pricePerHour = pitchData.pricePerHour;
                    if (pitchData.facilities) pitch.facilities = pitchData.facilities;

                    // Priority: Pitch specific time > Business time > null
                    if (pitchData.openTime) {
                        pitch.openTime = pitchData.openTime;
                    } else if (savedBusiness.openTime) {
                        pitch.openTime = savedBusiness.openTime;
                    }

                    if (pitchData.closeTime) {
                        pitch.closeTime = pitchData.closeTime;
                    } else if (savedBusiness.closeTime) {
                        pitch.closeTime = savedBusiness.closeTime;
                    }

                    pitch.business = savedBusiness;
                    pitch.businessId = savedBusiness.id;

                    const savedPitch = await queryRunner.manager.save(pitch);

                    // 4b. Create TimeSlots for this pitch
                    if (pitchData.timeSlots && Array.isArray(pitchData.timeSlots)) {
                        for (const slotData of pitchData.timeSlots) {
                            const timeSlot = new TimeSlot();
                            timeSlot.pitchId = savedPitch.id;
                            timeSlot.startTime = slotData.startTime;
                            timeSlot.endTime = slotData.endTime;
                            timeSlot.isActive = true;
                            await queryRunner.manager.save(timeSlot);
                        }
                    }
                }
            }

            await queryRunner.commitTransaction();

            const { password, ...result } = savedOwner;
            return {
                ...result,
                business: savedBusiness
            };

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
