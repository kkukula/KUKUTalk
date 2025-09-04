// CommonJS seed to avoid ts-node hassle on Windows
const {
  PrismaClient,
  Role,
  ClassRole,
  ClassMembershipStatus,
  ConversationMemberRole,
} = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // 1) Kid z rejestracji (fallback jeśli nie istnieje)
  let kid = await prisma.user.findUnique({ where: { username: 'kid1' } });
  if (!kid) {
    kid = await prisma.user.create({
      data: {
        username: 'kid1',
        displayName: 'Kid One',
        passwordHash: await bcrypt.hash('Passw0rd!', 10),
        role: Role.CHILD,
      },
    });
  }

  // 2) Nauczyciel
  const teacher = await prisma.user.upsert({
    where: { username: 'teacher1' },
    update: {},
    create: {
      username: 'teacher1',
      displayName: 'Teacher One',
      passwordHash: await bcrypt.hash('Passw0rd!', 10),
      role: Role.TEACHER,
    },
  });

  // 3) Klasa 1A (owned by teacher)
  let classroom = await prisma.classroom.findFirst({ where: { name: '1A' } });
  if (!classroom) {
    classroom = await prisma.classroom.create({
      data: {
        name: '1A',
        // inviteCode: 'WELCOME1A', // jeśli chcesz, możesz dodać (pole jest opcjonalne)
        teacherId: teacher.id,
      },
    });
  }

  // 4) Członkostwa klasy (idempotent)
  await prisma.classMembership.upsert({
    where: { classroomId_userId: { classroomId: classroom.id, userId: teacher.id } },
    update: { role: ClassRole.TEACHER, status: ClassMembershipStatus.ACTIVE },
    create: { classroomId: classroom.id, userId: teacher.id, role: ClassRole.TEACHER },
  });

  await prisma.classMembership.upsert({
    where: { classroomId_userId: { classroomId: classroom.id, userId: kid.id } },
    update: { role: ClassRole.STUDENT, status: ClassMembershipStatus.ACTIVE },
    create: { classroomId: classroom.id, userId: kid.id, role: ClassRole.STUDENT },
  });

  // 5) Konwersacja klasy (type CLASS)
  let conversation = await prisma.conversation.findFirst({
    where: { classroomId: classroom.id },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        type: 'CLASS',
        classroomId: classroom.id,
        createdById: teacher.id,
        lastMessageAt: new Date(),
      },
    });
  }

  // 6) Uczestnicy konwersacji
  await prisma.conversationMember.upsert({
    where: { conversationId_userId: { conversationId: conversation.id, userId: teacher.id } },
    update: { role: ConversationMemberRole.TEACHER },
    create: { conversationId: conversation.id, userId: teacher.id, role: ConversationMemberRole.TEACHER },
  });

  await prisma.conversationMember.upsert({
    where: { conversationId_userId: { conversationId: conversation.id, userId: kid.id } },
    update: {},
    create: { conversationId: conversation.id, userId: kid.id },
  });

  // 7) Wiadomość powitalna
  const msg = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: teacher.id,
      content: 'Welcome to class!',
      status: 'SENT',
    },
  });

  // 8) Aktualizacja lastMessageAt
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: msg.createdAt },
  });

  console.log('Seed done:', {
    teacher: teacher.username,
    kid: kid.username,
    classroom: classroom.name,
    conversationId: conversation.id,
    messageId: msg.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
