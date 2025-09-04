import { Injectable, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { GuardianLinkStatus, ContactStatus, ModerationStatus, ModerationDecision, TaskStatus } from '@prisma/client'

@Injectable()
export class ParentService {
  constructor(private prisma: PrismaService) {}

  private async getLinkedChildrenIds(parentId: string): Promise<string[]> {
    const links = await this.prisma.guardianLink.findMany({
      where: { parentId, status: GuardianLinkStatus.ACCEPTED },
      select: { childId: true },
    })
    return links.map((l) => l.childId)
  }

  async summary(parentId: string) {
    const childIds = await this.getLinkedChildrenIds(parentId)

    const [children, pendingContacts, openFlags, parentTasks] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: childIds } },
        select: { id: true, username: true, displayName: true, role: true },
        orderBy: { username: 'asc' },
      }),
      this.prisma.contact.findMany({
        where: { ownerId: { in: childIds }, status: ContactStatus.PENDING },
        include: {
          owner: { select: { id: true, displayName: true } },
          contactUser: { select: { id: true, displayName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.moderationFlag.findMany({
        where: {
          status: { in: [ModerationStatus.OPEN, ModerationStatus.BLOCKED] },
          message: { senderId: { in: childIds } },
        },
        include: {
          message: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              conversationId: true,
              sender: { select: { id: true, displayName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.task.findMany({
        where: { userId: parentId, status: TaskStatus.PENDING },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
        take: 20,
      }),
    ])

    // Messages sent in last 24h per child (simple loop)
    const since = new Date(Date.now() - 24 * 3600 * 1000)
    const activity: Record<string, number> = {}
    for (const id of childIds) {
      activity[id] = await this.prisma.message.count({
        where: { senderId: id, createdAt: { gt: since } },
      })
    }

    return {
      children,
      pendingContacts,
      openFlags,
      activityLast24h: activity,
      tasks: parentTasks,
      generatedAt: new Date().toISOString(),
    }
  }

  async alerts(parentId: string) {
    const childIds = await this.getLinkedChildrenIds(parentId)

    const [flags, pendingContacts] = await Promise.all([
      this.prisma.moderationFlag.findMany({
        where: {
          status: { in: [ModerationStatus.OPEN, ModerationStatus.BLOCKED] },
          message: { senderId: { in: childIds } },
        },
        include: {
          message: {
            select: {
              id: true,
              content: true,
              conversationId: true,
              sender: { select: { id: true, displayName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.contact.findMany({
        where: { ownerId: { in: childIds }, status: ContactStatus.PENDING },
        include: {
          owner: { select: { id: true, displayName: true } },
          contactUser: { select: { id: true, displayName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ])

    const alerts = [
      ...flags.map((f) => ({
        type: 'MODERATION' as const,
        severity: f.decision === ModerationDecision.BLOCK ? 'high' : 'medium',
        flagId: f.id,
        messageId: f.message?.id,
        conversationId: f.message?.conversationId,
        childId: f.message?.sender?.id,
        childName: f.message?.sender?.displayName,
        reason: f.reason,
        createdAt: f.createdAt,
      })),
      ...pendingContacts.map((c) => ({
        type: 'CONTACT_REQUEST' as const,
        severity: 'low' as const,
        contactId: c.id,
        childId: c.owner.id,
        childName: c.owner.displayName,
        requestedUserId: c.contactUser.id,
        requestedUserName: c.contactUser.displayName,
        createdAt: c.createdAt,
      })),
    ]

    return { alerts, count: alerts.length, generatedAt: new Date().toISOString() }
  }
}
