import { Controller, Request, Post, UseGuards, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { UsersService } from '../users/users.service';

import { CreateUserDto } from '../users/dto/create-user.dto';
import { RegisterBusinessDto } from './dto/register-business.dto';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private usersService: UsersService,
    ) { }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Request() req) {
        return this.authService.login(req.user);
    }

    @Post('send-otp')
    async sendOtp(@Body() body: { phone: string }) {
        await this.authService.sendOtp(body.phone);
        return { success: true };
    }

    @Post('verify-otp')
    async verifyOtp(@Body() body: { phone: string; code: string }) {
        await this.authService.verifyOtp(body.phone, body.code);
        return { verified: true };
    }

    @Post('register')
    async register(@Body() createUserDto: CreateUserDto) {
        try {
            const isVerified = await this.authService.isPhoneVerified(createUserDto.phone);
            if (!isVerified) {
                return {
                    statusCode: 400,
                    message: 'Telefon numarası doğrulanmamış.',
                    error: 'Bad Request',
                };
            }

            const user = await this.usersService.create(createUserDto);
            await this.authService.cleanupOtp(createUserDto.phone);

            const { password, ...result } = user;
            return result;
        } catch (error: any) {
            console.error('Registration error:', error.message);
            return {
                statusCode: 400,
                message: error.message || 'Registration failed',
                error: 'Bad Request'
            };
        }
    }
    @Post('business/login')
    async loginBusiness(@Body() body) {
        // Manual validation for now as we don't have a BusinessAuthGuard yet
        const owner = await this.authService.validateBusinessOwner(body.email, body.password);
        if (!owner) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.loginBusinessOwner(owner);
    }

    @Post('business/register')
    async registerBusiness(@Body() body: RegisterBusinessDto) {
        return this.authService.registerBusinessFull(body);
    }
}
