import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';

import { ConversationsController } from './conversations/conversations.controller';
import { MessagesService } from './conversations/messages.service';
import { ChatGateway } from './conversations/chat.gateway';

import { ModerationService } from './moderation/moderation.service';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
    }),
  ],
  controllers: [ConversationsController],
  providers: [MessagesService, ModerationService, ChatGateway],
})
export class AppModule {}
