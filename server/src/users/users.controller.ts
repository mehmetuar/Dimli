import { Controller, Get, Request, UseGuards, Post, Body, Patch, Delete, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get('check-username')
    async checkUsername(
        @Query('username') username: string,
        @Query('excludeId') excludeId?: string,
    ): Promise<{ available: boolean }> {
        if (!username || username.trim().length < 3) {
            return { available: false };
        }
        const taken = await this.usersService.isUsernameTaken(username.trim(), excludeId);
        return { available: !taken };
    }

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
    @Get('jokers')
    async getJokers(
        @Query('lat') lat?: string,
        @Query('lng') lng?: string,
        @Query('radius') radius?: string,
        @Query('position') position?: string,
        @Query('sharesFee') sharesFee?: string,
        @Query('offset') offset?: string,
        @Query('limit') limit?: string,
    ) {
        const geoFilter = {
            lat: lat ? parseFloat(lat) : undefined,
            lng: lng ? parseFloat(lng) : undefined,
            radius: radius ? parseFloat(radius) : 20,
            position,
            sharesFee: sharesFee !== undefined ? sharesFee === 'true' : undefined,
            offset: offset ? parseInt(offset, 10) : 0,
            limit: limit ? parseInt(limit, 10) : 50,
        };
        return this.usersService.getJokers(geoFilter);
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
    @Patch('push-token')
    async updatePushToken(@Request() req, @Body('token') token: string) {
        if (!token) return { success: false, message: 'Token is required' };
        await this.usersService.updatePushToken(req.user.id, token);
        return { success: true };
    }

    @UseGuards(JwtAuthGuard)
    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
        return this.usersService.changePassword(req.user.id, changePasswordDto);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('me')
    @HttpCode(HttpStatus.OK)
    async deleteAccount(
        @Request() req,
        @Body() body: { reason: string; note?: string; password: string },
    ) {
        await this.usersService.deleteAccount(req.user.id, body);
        return { success: true };
    }

    @Post('seed-feet')
    async seedFeet() {
        return this.usersService.seedFeet();
    }
}
