import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listByConversation(conversationId: string, take = 30, cursor?: string) {
    const itemsDesc = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
        status: true,
        conversationId: true,
        senderId: true,
        content: true,
        attachmentUrl: true,
      },
    });

    const items = itemsDesc.reverse();
    const nextCursor = itemsDesc.length === take ? itemsDesc[itemsDesc.length - 1].id : null;
    return { items, nextCursor };
  }

  async createMessage(userId: string, conversationId: string, content: string) {
    const msg = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        status: 'SENT',
      },
      select: {
        id: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
        status: true,
        conversationId: true,
        senderId: true,
        content: true,
        attachmentUrl: true,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return msg;
  }
}
