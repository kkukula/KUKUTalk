import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import {
  ConversationType,
  ConversationMemberRole,
  MessageStatus,
  Role,
} from '@prisma/client'

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('moderation') private moderationQueue: Queue,
  ) {}

  private async ensureMember(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    })
    if (!member) throw new ForbiddenException({ message: 'Not a conversation member' })
  }

  async createDirectConversation(creatorId: string, otherUserId: string) {
    if (creatorId === otherUserId) {
      throw new BadRequestException({ message: 'Cannot start conversation with yourself' })
    }
    // Check if exists
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.DIRECT,
        members: {
          every: {
            OR: [
              { userId: creatorId },
              { userId: otherUserId },
            ],
          },
        },
      },
    })
    if (existing) return existing

    return this.prisma.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        createdById: creatorId,
        members: {
          create: [
            { userId: creatorId, role: ConversationMemberRole.OWNER },
            { userId: otherUserId, role: ConversationMemberRole.MEMBER },
          ],
        },
      },
    })
  }

  async listConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { members: { some: { userId } } },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        type: true,
        classroomId: true,
        createdAt: true,
        lastMessageAt: true,
        members: {
          select: {
            user: { select: { id: true, username: true, displayName: true, role: true } },
          },
          take: 5,
        },
      },
    })
  }

  async getMessages(conversationId: string, userId: string, take = 30, cursor?: string) {
    await this.ensureMember(conversationId, userId)
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, Math.max(1, take)),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
        status: true,
        content: true,
        attachmentUrl: true,
        sender: { select: { id: true, username: true, displayName: true, role: true } },
      },
    })
  }

  async sendMessage(conversationId: string, senderId: string, content: string, attachmentUrl?: string) {
    if (!content && !attachmentUrl) {
      throw new BadRequestException({ message: 'Message content or attachment required' })
    }
    await this.ensureMember(conversationId, senderId)

    // Create message in REVIEW state; moderation will decide and broadcast accordingly
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: content || '',
        attachmentUrl: attachmentUrl || null,
        status: MessageStatus.REVIEW,
      },
      select: { id: true, conversationId: true, senderId: true, content: true, attachmentUrl: true, createdAt: true, status: true },
    })

    // Enqueue moderation job
    await this.moderationQueue.add('classify-message', { messageId: message.id }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } })

    return message
  }

  async editMessage(messageId: string, editorId: string, newContent: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } })
    if (!msg) throw new NotFoundException({ message: 'Message not found' })
    await this.ensureMember(msg.conversationId, editorId)
    if (msg.senderId !== editorId) throw new ForbiddenException({ message: 'Only sender can edit' })
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content: newContent, editedAt: new Date(), status: MessageStatus.REVIEW },
    })
    // Re-run moderation for edited message
    await this.moderationQueue.add('classify-message', { messageId: updated.id }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } })
    return updated
  }

  async deleteMessage(messageId: string, actorId: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } })
    if (!msg) throw new NotFoundException({ message: 'Message not found' })
    await this.ensureMember(msg.conversationId, actorId)
    // Sender or teacher/admin may delete; for MVP allow sender only
    if (msg.senderId !== actorId) throw new ForbiddenException({ message: 'Only sender can delete' })

    return this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), status: MessageStatus.DELETED },
    })
  }
}
