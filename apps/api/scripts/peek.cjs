const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const cls = await prisma.classroom.findFirst({ where: { name: '1A' } });
  const convo = await prisma.conversation.findFirst({ where: { classroomId: cls?.id } });
  const members = await prisma.conversationMember.findMany({
    where: { conversationId: convo?.id }, include: { user: true }
  });
  const msgs = await prisma.message.findMany({
    where: { conversationId: convo?.id }, orderBy: { createdAt: 'asc' }
  });
  console.log({ classroom: cls, conversation: convo, members, messages: msgs });
  await prisma.$disconnect();
})();
