import { IsEmail, IsOptional, IsString, MinLength, ValidateIf } from "class-validator";

export class LoginDto {
  @IsOptional()
  @ValidateIf(o => !o.email)
  @IsString()
  username?: string;

  @IsOptional()
  @ValidateIf(o => !o.username)
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
