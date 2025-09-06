import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PresenceService } from './presence.service';

@Controller('presence')
export class PresenceController {
  constructor(private readonly presence: PresenceService) {}

  @Post('heartbeat')
  async heartbeat(@Body() body: { userId: string; roomId?: string }) {
    await this.presence.heartbeat(body?.userId, body?.roomId);
    return { ok: true };
  }

  @Post('leave')
  async leave(@Body() body: { userId: string; roomId: string }) {
    await this.presence.leaveRoom(body?.userId, body?.roomId);
    return { ok: true };
  }

  @Get('online')
  async online() {
    const users = await this.presence.onlineUsers();
    return { users, count: users.length };
  }

  @Get('room')
  async room(@Query('roomId') roomId: string) {
    const users = await this.presence.roomMembers(roomId);
    return { roomId, users, count: users.length };
  }

  @Post('typing')
  async typing(@Body() body: { roomId: string; userId: string; isTyping: boolean }) {
    await this.presence.setTyping(body?.roomId, body?.userId, !!body?.isTyping);
    return { ok: true };
  }

  @Get('typing')
  async whoTyping(@Query('roomId') roomId: string) {
    const users = await this.presence.whoTyping(roomId);
    return { roomId, users };
  }
}
