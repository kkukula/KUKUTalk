import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterDto } from './register.dto'
import { LoginDto } from './login.dto'
import { RefreshDto } from './refresh.dto'
import { JwtAuthGuard } from './jwt-auth.guard'
import { Request } from 'express'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const res = await this.auth.register(dto)
    return res
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.auth.loginFlexible(dto.username, dto.password)
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken)
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Body() body: { refreshToken?: string }) {
    if (!body?.refreshToken) return { success: true }
    await this.auth.logout(body.refreshToken)
    return { success: true }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    // @ts-ignore
    const user = req.user
    return { user }
  }
}

