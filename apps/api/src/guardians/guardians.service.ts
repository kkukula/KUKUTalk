import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  GuardianLinkStatus,
  Role,
  RequestedBy,
} from '@prisma/client'

@Injectable()
export class GuardiansService {
  constructor(private prisma: PrismaService) {}

  async requestLink(childId: string, parentId: string, requestedBy: RequestedBy) {
    const [child, parent] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: childId } }),
      this.prisma.user.findUnique({ where: { id: parentId } }),
    ])
    if (!child) throw new NotFoundException({ message: 'Child not found' })
    if (!parent) throw new NotFoundException({ message: 'Parent not found' })
    if (child.role !== Role.CHILD) throw new BadRequestException({ message: 'childId must belong to CHILD' })
    if (parent.role !== Role.PARENT) throw new BadRequestException({ message: 'parentId must belong to PARENT' })

    const exists = await this.prisma.guardianLink.findUnique({
      where: { childId_parentId: { childId, parentId } },
    })
    if (exists) {
      throw new BadRequestException({ message: 'Link already exists' })
    }

    const status = requestedBy === RequestedBy.PARENT ? GuardianLinkStatus.ACCEPTED : GuardianLinkStatus.PENDING
    const decidedAt = status === GuardianLinkStatus.ACCEPTED ? new Date() : null

    return this.prisma.guardianLink.create({
      data: {
        childId,
        parentId,
        status,
        decidedAt: decidedAt ?? undefined,
      },
    })
  }

  async approveLink(linkId: string, actingParentId: string) {
    const link = await this.prisma.guardianLink.findUnique({ where: { id: linkId } })
    if (!link) throw new NotFoundException({ message: 'Link not found' })
    if (link.parentId !== actingParentId) {
      throw new ForbiddenException({ message: 'Only the designated parent can approve this link' })
    }
    if (link.status === GuardianLinkStatus.ACCEPTED) return link
    return this.prisma.guardianLink.update({
      where: { id: linkId },
      data: { status: GuardianLinkStatus.ACCEPTED, decidedAt: new Date() },
    })
  }

  async rejectLink(linkId: string, actingParentId: string) {
    const link = await this.prisma.guardianLink.findUnique({ where: { id: linkId } })
    if (!link) throw new NotFoundException({ message: 'Link not found' })
    if (link.parentId !== actingParentId) {
      throw new ForbiddenException({ message: 'Only the designated parent can reject this link' })
    }
    return this.prisma.guardianLink.update({
      where: { id: linkId },
      data: { status: GuardianLinkStatus.REJECTED, decidedAt: new Date() },
    })
  }

  async listForUser(userId: string) {
    return this.prisma.guardianLink.findMany({
      where: { OR: [{ parentId: userId }, { childId: userId }] },
      orderBy: { createdAt: 'desc' },
    })
  }
}
