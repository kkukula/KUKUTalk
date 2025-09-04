import { ConversationsModule } from './conversations/conversations.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';

import { ConversationsController } from './conversations/conversations.controller';
import { MessagesService } from './conversations/messages.service';
import { ChatGateway } from './conversations/chat.gateway';

import { ModerationService } from './moderation/moderation.service';

@Module({
  
    param($m)
    $inner = $m.Groups[1].Value
    # jeśli już jest, nie dubluj
    if ($inner -match "ConversationsModule") { "imports: [$inner]" }
    else {
      $innerTrim = $inner.Trim()
      if ($innerTrim.Length -eq 0) { "imports: [ConversationsModule]" }
      else { "imports: [$innerTrim, ConversationsModule]" }
    }
  ,
  controllers: [ConversationsController],
  providers: [MessagesService, ModerationService, ChatGateway],
})
export class AppModule {}

