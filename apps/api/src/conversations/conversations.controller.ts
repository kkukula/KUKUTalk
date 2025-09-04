import { Controller, Get, Param, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // <- poprawiona Ĺ›cieĹĽka
import { MessagesService } from './messages.service';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messages: MessagesService,
  ) {}

  // Lista rozmĂłw zalogowanego uĹĽytkownika
  @Get()
  async list(@Req() req: any) {
    const userId: string = req.user.userId;

    const convs = await this.prisma.conversation.findMany({
      where: { members: { some: { userId } } }, // nazwa relacji zgodna ze schematem
      orderBy: { lastMessageAt: 'desc' },
      select: {
        id: true,
        lastMessageAt: true,
        // JeĹ›li chcesz etykietÄ™: doĹ‚ĂłĹĽ select classroom/name zaleĹĽnie od modelu
        // classroom: { select: { name: true } },
      },
    });

    return { items: convs };
  }

  // Pobranie wiadomoĹ›ci w rozmowie (cursor + take)
  @Get(':id/messages')
  async listMessages(
    @Req() req: any,
    @Param('id') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('take') takeQ?: string,
  ) {
    const userId: string = req.user.userId;

    // Autoryzacja: user musi naleĹĽeÄ‡ do rozmowy
    const isMember = await this.prisma.conversation.findFirst({
      where: { id: conversationId, members: { some: { userId } } },
      select: { id: true },
    });
    if (!isMember) return { items: [], nextCursor: null };

    const take = Math.max(1, Math.min(100, parseInt(String(takeQ || '30'), 10) || 30));
    return this.messages.listByConversation(conversationId, take, cursor);
  }

  // WysĹ‚anie wiadomoĹ›ci
  @Post(':id/messages')
  async postMessage(
    @Req() req: any,
    @Param('id') conversationId: string,
    @Body() body: { content: string },
  ) {
    const userId: string = req.user.userId;
    const content = (body?.content || '').trim();
    if (!content) return { error: 'EMPTY' };

    const isMember = await this.prisma.conversation.findFirst({
      where: { id: conversationId, members: { some: { userId } } },
      select: { id: true },
    });
    if (!isMember) return { error: 'FORBIDDEN' };

    const msg = await this.messages.createMessage(userId, conversationId, content);
    return msg;
  }
}

