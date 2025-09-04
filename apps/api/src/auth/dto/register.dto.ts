import { IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator'

export class RegisterDto {
  @IsString()
  @Length(3, 32)
  username!: string

  @IsString()
  @Length(3, 64)
  displayName!: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsString()
  @Length(8, 128)
  password!: string

  @IsOptional()
  @IsIn(['CHILD', 'PARENT', 'TEACHER'])
  role?: 'CHILD' | 'PARENT' | 'TEACHER'
}
