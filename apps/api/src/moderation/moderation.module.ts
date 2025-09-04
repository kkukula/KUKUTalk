import { Module, forwardRef } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ModerationService } from './moderation.service'
import { ModerationController } from './moderation.controller'
import { ModerationProcessor } from './moderation.processor'
import { ChatModule } from '../chat/chat.module'

@Module({
  imports: [
    BullModule.registerQueue({ name: 'moderation' }),
    forwardRef(() => ChatModule),
  ],
  controllers: [ModerationController],
  providers: [ModerationService, ModerationProcessor],
  exports: [ModerationService],
})
export class ModerationModule {}
