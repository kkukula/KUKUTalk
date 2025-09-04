/* eslint-disable no-console */
import { PrismaClient, Role, UserStatus, GuardianLinkStatus, ContactStatus, RequestedBy, ConversationType, ConversationMemberRole, MessageStatus, ModerationType, ModerationSource, ModerationStatus, ModerationDecision, ClassRole, ClassMembershipStatus, ConsentType, AuditAction, TaskType, TaskStatus } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function reset() {
  console.log('⏳ Resetting database...')
  // Order matters due to FKs
  await prisma.moderationFlag.deleteMany()
  await prisma.message.deleteMany()
  await prisma.conversationMember.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.classMembership.deleteMany()
  await prisma.classroom.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.guardianLink.deleteMany()
  await prisma.task.deleteMany()
  await prisma.consentLog.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()
  console.log('✅ Database cleared')
}

async function seed() {
  console.log('🌱 Seeding data...')

  const password = 'Password123!'
  const passwordHash = await bcrypt.hash(password, 10)

  // Users
  const parent = await prisma.user.create({
    data: {
      username: 'parent_ania',
      email: 'ania.parent@example.com',
      displayName: 'Ania (Rodzic)',
      passwordHash,
      role: Role.PARENT,
      status: UserStatus.ACTIVE,
    },
  })

  const child1 = await prisma.user.create({
    data: {
      username: 'kid_kuba',
      email: 'kuba.kid@example.com',
      displayName: 'Kuba (7)',
      passwordHash,
      role: Role.CHILD,
      status: UserStatus.ACTIVE,
    },
  })

  const child2 = await prisma.user.create({
    data: {
      username: 'kid_maya',
      email: 'maya.kid@example.com',
      displayName: 'Maja (9)',
      passwordHash,
      role: Role.CHILD,
      status: UserStatus.ACTIVE,
    },
  })

  const teacher = await prisma.user.create({
    data: {
      username: 'teacher_tomek',
      email: 'tomek.teacher@example.com',
      displayName: 'Tomek (Nauczyciel)',
      passwordHash,
      role: Role.TEACHER,
      status: UserStatus.ACTIVE,
    },
  })

  const admin = await prisma.user.create({
    data: {
      username: 'admin_ola',
      email: 'ola.admin@example.com',
      displayName: 'Ola (Admin)',
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  })

  // Parent-child links
  const link1 = await prisma.guardianLink.create({
    data: {
      childId: child1.id,
      parentId: parent.id,
      status: GuardianLinkStatus.ACCEPTED,
      decidedAt: new Date(),
    },
  })

  const link2 = await prisma.guardianLink.create({
    data: {
      childId: child2.id,
      parentId: parent.id,
      status: GuardianLinkStatus.PENDING,
    },
  })

  // Contacts (whitelist for child1)
  const contactKidToKid = await prisma.contact.create({
    data: {
      ownerId: child1.id,
      contactUserId: child2.id,
      status: ContactStatus.APPROVED,
      requestedBy: RequestedBy.CHILD,
      approvedByParentId: parent.id,
      approvedAt: new Date(),
    },
  })

  const contactKidToTeacher = await prisma.contact.create({
    data: {
      ownerId: child1.id,
      contactUserId: teacher.id,
      status: ContactStatus.APPROVED,
      requestedBy: RequestedBy.PARENT,
      approvedByParentId: parent.id,
      approvedAt: new Date(),
    },
  })

  // Classroom + membership
  const classroom = await prisma.classroom.create({
    data: {
      name: '1A – Szkoła Podstawowa',
      inviteCode: '1A-INVITE',
      teacherId: teacher.id,
    },
  })

  const classMembershipTeacher = await prisma.classMembership.create({
    data: {
      classroomId: classroom.id,
      userId: teacher.id,
      role: ClassRole.TEACHER,
      status: ClassMembershipStatus.ACTIVE,
    },
  })
  const classMembershipChild1 = await prisma.classMembership.create({
    data: {
      classroomId: classroom.id,
      userId: child1.id,
      role: ClassRole.STUDENT,
      status: ClassMembershipStatus.ACTIVE,
    },
  })
  const classMembershipChild2 = await prisma.classMembership.create({
    data: {
      classroomId: classroom.id,
      userId: child2.id,
      role: ClassRole.STUDENT,
      status: ClassMembershipStatus.INVITED,
    },
  })

  // Conversations
  const directConv = await prisma.conversation.create({
    data: {
      type: ConversationType.DIRECT,
      createdById: child1.id,
      members: {
        create: [
          { userId: child1.id, role: ConversationMemberRole.OWNER },
          { userId: child2.id, role: ConversationMemberRole.MEMBER },
        ],
      },
    },
  })

  const classConv = await prisma.conversation.create({
    data: {
      type: ConversationType.CLASS,
      classroomId: classroom.id,
      createdById: teacher.id,
      members: {
        create: [
          { userId: teacher.id, role: ConversationMemberRole.OWNER },
          { userId: child1.id, role: ConversationMemberRole.MEMBER },
        ],
      },
    },
  })

  // Messages in direct conversation
  const m1 = await prisma.message.create({
    data: {
      conversationId: directConv.id,
      senderId: child1.id,
      content: 'Cześć Maja! Jak Ci mija dzień? 🌞',
      status: MessageStatus.SENT,
    },
  })

  const m2 = await prisma.message.create({
    data: {
      conversationId: directConv.id,
      senderId: child2.id,
      content: 'Hej Kuba! Jest super, właśnie kończę zadanie domowe.',
      status: MessageStatus.SENT,
    },
  })

  // Message that will be set to REVIEW by moderation
  const m3 = await prisma.message.create({
    data: {
      conversationId: directConv.id,
      senderId: child1.id,
      content: 'To słowo jest brzydkie 🤐',
      status: MessageStatus.REVIEW,
    },
  })

  await prisma.moderationFlag.create({
    data: {
      messageId: m3.id,
      type: ModerationType.PROFANITY,
      source: ModerationSource.RULES,
      status: ModerationStatus.OPEN,
      decision: ModerationDecision.REVIEW,
      scores: { profanity: 0.88 },
      reason: 'Potencjalne wulgaryzmy – do weryfikacji',
    } as any,
  })

  // Messages in class conversation
  await prisma.message.create({
    data: {
      conversationId: classConv.id,
      senderId: teacher.id,
      content: 'Dzień dobry 1A! Jutro przynosimy kredki i blok techniczny ✏️',
      status: MessageStatus.SENT,
    },
  })

  // Consent logs
  await prisma.consentLog.createMany({
    data: [
      { userId: parent.id, type: ConsentType.TERMS, granted: true, ip: '127.0.0.1' },
      { userId: parent.id, type: ConsentType.PRIVACY, granted: true, ip: '127.0.0.1' },
      { userId: child1.id, type: ConsentType.PARENTAL, granted: true, ip: '127.0.0.1' },
    ],
  })

  // Audit logs
  await prisma.auditLog.createMany({
    data: [
      { actorId: parent.id, action: AuditAction.USER_REGISTER, ip: '127.0.0.1' },
      { actorId: child1.id, action: AuditAction.USER_REGISTER, ip: '127.0.0.1' },
      { actorId: teacher.id, action: AuditAction.CLASS_CREATE, ip: '127.0.0.1', meta: { classroomId: classroom.id } as any },
      { actorId: child1.id, action: AuditAction.MESSAGE_SEND, ip: '127.0.0.1', meta: { conversationId: directConv.id } as any },
    ],
  })

  // Example tasks/reminders
  await prisma.task.createMany({
    data: [
      {
        userId: parent.id,
        title: 'Przegląd kontaktów do akceptacji',
        description: 'Sprawdź nowe prośby o dodanie kontaktów dla Kuby.',
        type: TaskType.OTHER,
        status: TaskStatus.PENDING,
        dueAt: new Date(Date.now() + 24 * 3600 * 1000),
      },
      {
        userId: child1.id,
        title: 'Ćwiczenie z mnożenia',
        description: 'Krótki quiz matematyczny (15 min).',
        type: TaskType.EDU_REMINDER,
        status: TaskStatus.PENDING,
        dueAt: new Date(Date.now() + 2 * 3600 * 1000),
      },
    ],
  })

  // Update lastMessageAt for conversations
  const lastDirect = await prisma.message.findFirst({
    where: { conversationId: directConv.id },
    orderBy: { createdAt: 'desc' },
  })
  const lastClass = await prisma.message.findFirst({
    where: { conversationId: classConv.id },
    orderBy: { createdAt: 'desc' },
  })
  if (lastDirect) {
    await prisma.conversation.update({ where: { id: directConv.id }, data: { lastMessageAt: lastDirect.createdAt } })
  }
  if (lastClass) {
    await prisma.conversation.update({ where: { id: classConv.id }, data: { lastMessageAt: lastClass.createdAt } })
  }

  console.log('✅ Seed complete')
  console.log('Demo users:')
  console.log(`  Parent  : ${parent.username} / ${password}`)
  console.log(`  Child 1 : ${child1.username} / ${password}`)
  console.log(`  Child 2 : ${child2.username} / ${password}`)
  console.log(`  Teacher : ${teacher.username} / ${password}`)
  console.log(`  Admin   : ${admin.username} / ${password}`)
}

async function main() {
  await reset()
  await seed()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
