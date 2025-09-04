import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ContactStatus, RequestedBy, Role, GuardianLinkStatus } from '@prisma/client'

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create contact request for a child (ownerId) to add contactUserId.
   * - CHILD can only create for themselves
   * - PARENT can create for their linked child (ACCEPTED link)
   */
  async requestContact(ownerId: string, contactUserId: string, requestedBy: RequestedBy, actingUserId: string, actingRole: Role) {
    if (ownerId === contactUserId) {
      throw new BadRequestException({ message: 'Cannot add yourself as a contact' })
    }

    const [owner, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: ownerId } }),
      this.prisma.user.findUnique({ where: { id: contactUserId } }),
    ])
    if (!owner) throw new NotFoundException({ message: 'Owner (child) not found' })
    if (!target) throw new NotFoundException({ message: 'Contact user not found' })
    if (owner.role !== Role.CHILD) throw new BadRequestException({ message: 'ownerId must belong to CHILD' })

    if (actingRole === Role.CHILD && actingUserId !== ownerId) {
      throw new ForbiddenException({ message: 'Child can only request contacts for themselves' })
    }
    if (actingRole === Role.PARENT) {
      const link = await this.prisma.guardianLink.findFirst({
        where: { parentId: actingUserId, childId: ownerId, status: GuardianLinkStatus.ACCEPTED },
      })
      if (!link) {
        throw new ForbiddenException({ message: 'Parent is not linked to this child' })
      }
    }

    const existing = await this.prisma.contact.findUnique({
      where: { ownerId_contactUserId: { ownerId, contactUserId } },
    })
    if (existing) return existing

    const status = requestedBy === RequestedBy.PARENT ? ContactStatus.APPROVED : ContactStatus.PENDING
    const approvedByParentId = status === ContactStatus.APPROVED ? actingUserId : null
    const approvedAt = status === ContactStatus.APPROVED ? new Date() : null

    return this.prisma.contact.create({
      data: {
        ownerId,
        contactUserId,
        status,
        requestedBy,
        approvedByParentId: approvedByParentId ?? undefined,
        approvedAt: approvedAt ?? undefined,
      },
    })
  }

  /**
   * Approve a pending contact request by a parent linked to the child.
   */
  async approve(contactId: string, actingParentId: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact) throw new NotFoundException({ message: 'Contact request not found' })
    const link = await this.prisma.guardianLink.findFirst({
      where: { parentId: actingParentId, childId: contact.ownerId, status: GuardianLinkStatus.ACCEPTED },
    })
    if (!link) throw new ForbiddenException({ message: 'Parent is not linked to this child' })
    if (contact.status === ContactStatus.APPROVED) return contact
    return this.prisma.contact.update({
      where: { id: contactId },
      data: { status: ContactStatus.APPROVED, approvedByParentId: actingParentId, approvedAt: new Date() },
    })
  }

  /**
   * List contacts for child or for a parent (by childId).
   * - CHILD: returns own contacts
   * - PARENT: requires accepted link to given childId
   */
  async listForChild(childId: string, actingUserId: string, actingRole: Role) {
    if (actingRole === Role.CHILD && actingUserId !== childId) {
      throw new ForbiddenException({ message: 'Forbidden' })
    }
    if (actingRole === Role.PARENT) {
      const link = await this.prisma.guardianLink.findFirst({
        where: { parentId: actingUserId, childId, status: GuardianLinkStatus.ACCEPTED },
      })
      if (!link) throw new ForbiddenException({ message: 'Parent is not linked to this child' })
    }
    return this.prisma.contact.findMany({
      where: { ownerId: childId, status: ContactStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
      include: { contactUser: { select: { id: true, username: true, displayName: true, role: true } } },
    })
  }
}
