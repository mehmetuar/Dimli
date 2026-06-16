import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserBlocksService } from './user-blocks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserBlocksController {
  constructor(private readonly userBlocksService: UserBlocksService) {}

  @Post('block/:userId')
  async blockUser(@Param('userId') userId: string, @Request() req) {
    await this.userBlocksService.blockUser(
      (req.user as { id: string }).id,
      userId,
    );
    return { success: true };
  }

  @Delete('block/:userId')
  async unblockUser(@Param('userId') userId: string, @Request() req) {
    await this.userBlocksService.unblockUser(
      (req.user as { id: string }).id,
      userId,
    );
    return { success: true };
  }

  @Get('blocks')
  async getBlockedUserIds(@Request() req) {
    const blockedUserIds = await this.userBlocksService.getBlockedUserIds(
      (req.user as { id: string }).id,
    );
    return { blockedUserIds };
  }

  @Get('blocks/details')
  async getBlockedUsers(@Request() req) {
    return this.userBlocksService.getBlockedUsers(
      (req.user as { id: string }).id,
    );
  }
}
