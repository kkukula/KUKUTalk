import { IsString, Length } from 'class-validator'

export class LoginDto {
  @IsString()
  @Length(3, 32)
  username!: string

  @IsString()
  @Length(8, 128)
  password!: string
}
