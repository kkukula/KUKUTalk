import { Body, Controller, HttpException, HttpStatus, Post } from "@nestjs/common";
import { CreateConversationDto } from "./dto/create-conversation.dto";

@Controller("conversations")
export class ConversationsController {
  @Post()
  create(@Body() dto: CreateConversationDto) {
    // Stub kontraktowy  w następnym kroku podmienimy na realną implementację z DB
    throw new HttpException(
      {
        error: "NOT_IMPLEMENTED",
        hint: "Persistence will be added in the next step.",
        received: dto,
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
