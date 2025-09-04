import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ClassMembershipStatus, ClassRole, ConversationMemberRole, ConversationType, Role } from '@prisma/client'

function genInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

@Injectable()
export class ClassroomsService {
  constructor(private prisma: PrismaService) {}

  async createClassroom(teacherId: string, name: string) {
    // Ensure teacher exists & is TEACHER
    const teacher = await this.prisma.user.findUnique({ where: { id: teacherId } })
    if (!teacher || teacher.role !== Role.TEACHER) {
      throw new ForbiddenException({ message: 'Only teachers can create classrooms' })
    }

    const classroom = await this.prisma.classroom.create({
      data: {
        name,
        teacherId,
        inviteCode: genInviteCode(),
      },
    })

    // Create class conversation
    const conv = await this.prisma.conversation.create({
      data: {
        type: ConversationType.CLASS,
        classroomId: classroom.id,
        createdById: teacherId,
        members: { create: [{ userId: teacherId, role: ConversationMemberRole.OWNER }] },
      },
    })

    // Link classroom -> conversation
    await this.prisma.classroom.update({
      where: { id: classroom.id },
      data: { conversation: { connect: { id: conv.id } } },
    })

    // Add teacher membership
    await this.prisma.classMembership.create({
      data: {
        classroomId: classroom.id,
        userId: teacherId,
        role: ClassRole.TEACHER,
        status: ClassMembershipStatus.ACTIVE,
      },
    })

    return { classroom, conversationId: conv.id }
  }

  async invite(classroomId: string, actingTeacherId: string, userId: string, role: ClassRole = ClassRole.STUDENT) {
    const classroom = await this.prisma.classroom.findUnique({ where: { id: classroomId } })
    if (!classroom) throw new NotFoundException({ message: 'Classroom not found' })
    if (classroom.teacherId !== actingTeacherId) {
      throw new ForbiddenException({ message: 'Only the classroom teacher can invite' })
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException({ message: 'User not found' })

    const existing = await this.prisma.classMembership.findUnique({
      where: { classroomId_userId: { classroomId, userId } },
    })
    if (existing) return existing

    return this.prisma.classMembership.create({
      data: { classroomId, userId, role, status: ClassMembershipStatus.INVITED },
    })
  }

  async getClassroom(classroomId: string, requesterId: string) {
    // Allow teacher or any member to view
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        memberships: {
          include: { user: { select: { id: true, username: true, displayName: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        conversation: { select: { id: true } },
      },
    })
    if (!classroom) throw new NotFoundException({ message: 'Classroom not found' })

    const isMember = classroom.memberships.some((m) => m.userId === requesterId)
    if (!isMember && classroom.teacherId !== requesterId) {
      throw new ForbiddenException({ message: 'Forbidden' })
    }

    return classroom
  }
}
