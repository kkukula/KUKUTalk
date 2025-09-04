import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { MulterModule } from '@nestjs/platform-express'
import { ChatService } from './chat.service'
import { ChatController } from './chat.controller'
import { ChatGateway } from './chat.gateway'

@Module({
  imports: [
    BullModule.registerQueue({ name: 'moderation' }),
    MulterModule.register({
      dest: process.env.UPLOAD_DIR || 'uploads',
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
