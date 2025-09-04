const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const classroom = await prisma.classroom.findFirst({ where: { name: '1A' } });
  if (!classroom) throw new Error('Class 1A not found (run db seed first)');
  const convo = await prisma.conversation.findFirst({ where: { classroomId: classroom.id } });
  if (!convo) throw new Error('Conversation for class 1A not found');

  const teacher = await prisma.user.findUnique({ where: { username: 'teacher1' } });
  const kid = await prisma.user.findUnique({ where: { username: 'kid1' } });

  const authors = [teacher.id, kid.id]; // naprzemiennie
  const created = [];
  for (let i = 1; i <= 10; i++) {
    const senderId = authors[i % 2];
    const msg = await prisma.message.create({
      data: {
        conversationId: convo.id,
        senderId,
        content: `msg #${i} at ${new Date().toISOString()}`,
        status: 'SENT',
      },
      select: { id: true, senderId: true, content: true, createdAt: true },
    });
    created.push(msg);
  }

  // zaktualizuj znacznik ostatniej wiadomości
  const last = created[created.length - 1];
  await prisma.conversation.update({
    where: { id: convo.id },
    data: { lastMessageAt: last.createdAt },
  });

  console.log(`Inserted ${created.length} messages into convo ${convo.id}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
