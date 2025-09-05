import { LoginDto } from './dto/login.dto';
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import Redis from 'ioredis'
import { RegisterDto } from './register.dto'

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m'
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d'
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret'
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/0'

type JwtPayload = {
  sub: string
  username: string
  role: string
  jti: string
}

@Injectable()
export  param($m) $m.Groups[1].Value + $m.Groups[2].Value.TrimEnd() + "`r`n" + $flexMethod + "`r`n}" 
