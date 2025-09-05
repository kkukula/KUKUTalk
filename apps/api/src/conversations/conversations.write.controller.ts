import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Controller('conversations')
export class ConversationsWriteController {
  @Post()
  create(@Body() dto: CreateConversationDto) {
    throw new HttpException({ error: 'NOT_IMPLEMENTED', received: dto }, HttpStatus.NOT_IMPLEMENTED);
  }
}
