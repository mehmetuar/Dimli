import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Get('channels')
    getUserChannels(@Request() req) {
        return this.chatService.getUserChannels(req.user.id);
    }

    @Get('channels/:id/messages')
    getChannelMessages(@Param('id') id: string) {
        return this.chatService.getChannelMessages(id);
    }

    @Post('channels/:id/messages')
    sendMessage(
        @Param('id') id: string,
        @Body('content') content: string,
        @Request() req
    ) {
        return this.chatService.sendMessage(id, req.user.id, content);
    }

    @Post('channels/:id/read')
    markAsRead(@Param('id') id: string, @Request() req) {
        return this.chatService.markAsRead(id, req.user.id);
    }

    @Get('unread-count')
    getUnreadCount(@Request() req) {
        return this.chatService.getUnreadCount(req.user.id);
    }
}
