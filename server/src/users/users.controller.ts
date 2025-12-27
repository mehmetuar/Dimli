import { Controller, Get, Request, UseGuards, Post, Body, Patch, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getProfile(@Request() req) {
        // req.user is populated by JwtStrategy (contains { id, username })
        const user = await this.usersService.findById(req.user.id);
        if (!user) {
            return null;
        }
        const { password, ...result } = user;
        return result;
    }

    @UseGuards(JwtAuthGuard)
    @Get('search')
    async search(@Request() req) {
        const query = req.query.q;
        if (!query) return [];
        return this.usersService.search(query);
    }


    @UseGuards(JwtAuthGuard)
    @Patch('me')
    async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
        const user = await this.usersService.update(req.user.id, updateUserDto);
        if (!user) {
            return null;
        }
        const { password, ...result } = user;
        return result;
    }

    @UseGuards(JwtAuthGuard)
    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
        return this.usersService.changePassword(req.user.id, changePasswordDto);
    }

    @Post('seed-feet')
    async seedFeet() {
        return this.usersService.seedFeet();
    }
}
