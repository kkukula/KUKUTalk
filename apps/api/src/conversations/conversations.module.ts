import { Module } from "@nestjs/common";
import { ConversationsController } from "./conversations.controller";

@Module({
  controllers: [ConversationsController],
  providers: [],
})
export class ConversationsModule {}
