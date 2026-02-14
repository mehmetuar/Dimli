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

    @Post('register')
    async register(@Body() createUserDto: CreateUserDto) {
        try {
            const user = await this.usersService.create(createUserDto);
            // Remove password from response
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
