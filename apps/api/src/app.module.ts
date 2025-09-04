import { Module } from '@nestjs/common';
import { AppModule } from './app.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { ClassroomsModule } from './classrooms/classrooms.module';
import { ContactsModule } from './contacts/contacts.module';
import { ConversationsModule } from './conversations/conversations.module';
import { GuardiansModule } from './guardians/guardians.module';
import { ModerationModule } from './moderation/moderation.module';
import { ParentModule } from './parent/parent.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './shared/users.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [ AppModule, AuthModule, ChatModule, ClassroomsModule, ContactsModule, ConversationsModule, GuardiansModule, ModerationModule, ParentModule, PrismaModule, UsersModule, UsersModule ],
})
export class AppModule {}
