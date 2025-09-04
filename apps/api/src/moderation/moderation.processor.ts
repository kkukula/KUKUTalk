import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { PrismaService } from '../prisma/prisma.service'
import { Injectable, Logger } from '@nestjs/common'
import { ModerationDecision, ModerationSource, ModerationStatus, ModerationType, MessageStatus } from '@prisma/client'
import { ChatGateway } from '../chat/chat.gateway'

type ClassifyJob = { messageId: string }

@Injectable()
@Processor('moderation')
export class ModerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ModerationProcessor.name)
  private aiUrl = process.env.AI_MODERATION_URL || 'http://localhost:4001'

  constructor(private prisma: PrismaService, private gateway: ChatGateway) {
    super()
  }

  async process(job: Job<ClassifyJob, any, string>) {
    const { messageId } = job.data
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, content: true, senderId: true, conversationId: true, createdAt: true },
    })
    if (!message) {
      this.logger.warn(`Message ${messageId} not found`)
      return
    }

    // Call AI moderation stub
    let result: { labels: string[]; scores: Record<string, number>; action: ModerationDecision } | null = null
    try {
      const resp = await fetch(`${this.aiUrl}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message.content }),
      })
      if (resp.ok) {
        result = await resp.json()
      } else {
        this.logger.warn(`AI moderation responded ${resp.status}`)
      }
    } catch (e) {
      this.logger.error('AI moderation call failed', e as any)
    }

    // Fallback rule-based decision if AI fails
    if (!result) {
      const lowContent = (message.content || '').trim().length === 0
      result = {
        labels: lowContent ? ['OTHER'] : ['SAFE'],
        scores: { safe: lowContent ? 0.6 : 0.99 },
        action: lowContent ? ModerationDecision.REVIEW : ModerationDecision.ALLOW,
      }
    }

    // Create flag
    const flag = await this.prisma.moderationFlag.create({
      data: {
        messageId: message.id,
        type: this.mapLabelToType(result.labels[0]),
        source: ModerationSource.RULES,
        status: result.action === ModerationDecision.BLOCK ? ModerationStatus.BLOCKED : ModerationStatus.OPEN,
        decision: result.action,
        scores: result.scores as any,
        reason: result.labels.join(','),
      } as any,
    })

    // Update message and broadcast
    if (result.action === ModerationDecision.ALLOW) {
      await this.prisma.message.update({ where: { id: message.id }, data: { status: MessageStatus.SENT } })
      this.gateway.notifyModerationDecision({
        conversationId: message.conversationId,
        message,
        action: 'ALLOW',
      })
    } else if (result.action === ModerationDecision.BLOCK) {
      await this.prisma.message.update({ where: { id: message.id }, data: { status: MessageStatus.BLOCKED } })
      this.gateway.notifyModerationDecision({
        conversationId: message.conversationId,
        message,
        action: 'BLOCK',
      })
    } else {
      // REVIEW: keep status REVIEW, notify sender's room
      this.gateway.notifyModerationDecision({
        conversationId: message.conversationId,
        message,
        action: 'REVIEW',
      })
    }

    return flag
  }

  private mapLabelToType(label: string): ModerationType {
    switch (label?.toUpperCase()) {
      case 'PROFANITY': return ModerationType.PROFANITY
      case 'VIOLENCE': return ModerationType.VIOLENCE
      case 'GROOMING': return ModerationType.GROOMING
      case 'SELF_HARM': return ModerationType.SELF_HARM
      default: return ModerationType.OTHER
    }
  }
}
