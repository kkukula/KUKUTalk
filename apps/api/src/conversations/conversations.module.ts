import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ChatGateway } from './chat.gateway';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    JwtModule.register({ // używane do weryfikacji tokena w WS
      secret: process.env.JWT_SECRET || 'devsecret_change_me',
    }),
  ],
  controllers: [ConversationsController],
  providers: [ChatGateway],
})
export class ConversationsModule {}
