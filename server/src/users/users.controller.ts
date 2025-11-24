import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
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
}
