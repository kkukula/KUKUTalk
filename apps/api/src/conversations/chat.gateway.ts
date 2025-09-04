import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../infra/prisma/prisma.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway {
  @WebSocketServer() server!: Server;

  constructor(private readonly prisma: PrismaService) {}

  @SubscribeMessage('conversation:join')
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: { conversationId: string }) {
    const room = `conv:${payload.conversationId}`;
    client.join(room);
    client.emit('conversation:joined', { room });
  }

  @SubscribeMessage('message:send')
  async onSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; senderId: string; content: string },
  ) {
    const { conversationId, senderId, content } = payload;
    if (!content?.trim()) return;

    // prosto bez auth w gatewayu (auth i tak jest na HTTP i w DB)
    const msg = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: content.trim(),
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

    this.server.to(`conv:${conversationId}`).emit('message:new', msg);
  }
}
