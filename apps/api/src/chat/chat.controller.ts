import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../shared/roles.guard'
import { ChatService } from './chat.service'
import { FileInterceptor } from '@nestjs/platform-express'

class CreateDirectDto {
  otherUserId!: string
}

class SendMessageDto {
  content?: string
}

class EditMessageDto {
  content!: string
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  // --- Conversations ---
  @Post('conversations')
  async createDirect(@Body() dto: CreateDirectDto, @Req() req: any) {
    return this.chat.createDirectConversation(req.user.userId, dto.otherUserId)
  }

  @Get('conversations')
  async list(@Req() req: any) {
    return this.chat.listConversations(req.user.userId)
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') id: string,
    @Query('take') take: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Req() req: any,
  ) {
    const t = take ? Number(take) : 30
    return this.chat.getMessages(id, req.user.userId, t, cursor)
  }

  // --- Messages ---
  @Post('conversations/:id/messages')
  async send(@Param('id') conversationId: string, @Body() dto: SendMessageDto, @Req() req: any) {
    return this.chat.sendMessage(conversationId, req.user.userId, dto.content ?? '')
  }

  @UseInterceptors(FileInterceptor('file'))
  @Post('conversations/:id/upload')
  async upload(
    @Param('id') conversationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const attachmentUrl = file ? `uploads/${file.filename}` : undefined
    return this.chat.sendMessage(conversationId, req.user.userId, '', attachmentUrl)
  }

  @Patch('messages/:id')
  async edit(@Param('id') id: string, @Body() dto: EditMessageDto, @Req() req: any) {
    return this.chat.editMessage(id, req.user.userId, dto.content)
  }

  @Delete('messages/:id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.chat.deleteMessage(id, req.user.userId)
  }
}
