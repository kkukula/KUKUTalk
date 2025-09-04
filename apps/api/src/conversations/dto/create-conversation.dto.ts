import { IsArray, IsIn, IsOptional, IsString } from "class-validator";

export class CreateConversationDto {
  @IsIn(["DIRECT", "GROUP"])
  type!: "DIRECT" | "GROUP";

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantIds?: string[];

  @IsOptional()
  @IsString()
  title?: string;
}
