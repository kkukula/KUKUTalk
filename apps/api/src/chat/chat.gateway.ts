import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import * as jwt from 'jsonwebtoken'
import { ChatService } from './chat.service'

type JwtPayload = { sub: string; username: string; role: string }

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/ws',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  constructor(private readonly chat: ChatService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers['authorization'] as string)?.replace('Bearer ', '') ||
        ''

      const secret = process.env.JWT_ACCESS_SECRET || 'dev_access_secret'
      const payload = jwt.verify(token, secret) as JwtPayload
      client.data.user = { id: payload.sub, username: payload.username, role: payload.role }
      client.emit('connection:ack', { ok: true, user: client.data.user })
    } catch (e) {
      client.emit('error', { message: 'Unauthorized' })
      client.disconnect(true)
    }
  }

  async handleDisconnect(client: Socket) {
    // Optional: broadcast presence offline to joined rooms
  }

  @SubscribeMessage('rooms:join')
  async joinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    const userId = client.data.user?.id as string
    try {
      // Validate membership by attempting to read messages (cheap + reuses service auth)
      await this.chat.getMessages(data.conversationId, userId, 1)
      client.join(this.roomName(data.conversationId))
      client.emit('rooms:joined', { conversationId: data.conversationId })
    } catch (e) {
      client.emit('error', { message: 'Cannot join room' })
    }
  }

  @SubscribeMessage('rooms:leave')
  leaveRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.leave(this.roomName(data.conversationId))
    client.emit('rooms:left', { conversationId: data.conversationId })
  }

  @SubscribeMessage('message:send')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content?: string },
  ) {
    const userId = client.data.user?.id as string
    const msg = await this.chat.sendMessage(data.conversationId, userId, data.content || '')
    // Inform sender that message awaits moderation
    client.emit('moderation:notice', {
      conversationId: data.conversationId,
      messageId: msg.id,
      action: 'REVIEW',
      text: 'Wiadomość czeka na sprawdzenie.',
    })
    // Do NOT broadcast yet; final decision will be handled by moderation processor
  }

  @SubscribeMessage('message:edited')
  async editMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; content: string },
  ) {
    const userId = client.data.user?.id as string
    const updated = await this.chat.editMessage(data.messageId, userId, data.content)
    client.emit('moderation:notice', {
      conversationId: updated.conversationId,
      messageId: updated.id,
      action: 'REVIEW',
      text: 'Zmieniona wiadomość czeka na sprawdzenie.',
    })
  }

  @SubscribeMessage('message:deleted')
  async deleteMessage(@ConnectedSocket() client: Socket, @MessageBody() data: { messageId: string }) {
    const userId = client.data.user?.id as string
    const deleted = await this.chat.deleteMessage(data.messageId, userId)
    this.server.to(this.roomName(deleted.conversationId)).emit('message:deleted', { messageId: deleted.id })
  }

  @SubscribeMessage('presence:update')
  async presence(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string; status: 'online' | 'away' | 'dnd' | 'offline' },
  ) {
    const payload = { userId: client.data.user?.id, status: data.status }
    if (data.conversationId) {
      this.server.to(this.roomName(data.conversationId)).emit('presence:update', payload)
    } else {
      client.broadcast.emit('presence:update', payload)
    }
  }

  @SubscribeMessage('typing')
  async typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    const payload = { userId: client.data.user?.id, isTyping: data.isTyping }
    this.server.to(this.roomName(data.conversationId)).emit('typing', payload)
  }

  // Helper for other services (e.g., moderation processor) to broadcast decisions
  notifyModerationDecision(params: {
    conversationId: string
    message: { id: string; content: string; senderId: string; createdAt: Date }
    action: 'ALLOW' | 'BLOCK' | 'REVIEW'
  }) {
    const room = this.roomName(params.conversationId)
    if (params.action === 'ALLOW') {
      this.server.to(room).emit('message:new', params.message)
    } else if (params.action === 'BLOCK') {
      this.server.to(room).emit('moderation:blocked', { messageId: params.message.id })
    } else {
      this.server.to(room).emit('moderation:notice', {
        conversationId: params.conversationId,
        messageId: params.message.id,
        action: 'REVIEW',
      })
    }
  }

  private roomName(conversationId: string) {
    return `conv:${conversationId}`
  }
}
