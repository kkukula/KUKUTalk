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
export class AuthService {
  private redis = new Redis(REDIS_URL)

  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } })
    if (exists) {
      throw new BadRequestException({ message: 'Username already taken' })
    }
    const hash = await bcrypt.hash(dto.password, 10)
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email ?? null,
        displayName: dto.displayName,
        passwordHash: hash,
        role: dto.role ?? 'CHILD',
      },
      select: { id: true, username: true, displayName: true, role: true, createdAt: true },
    })
    const tokens = await this.issueTokens(user.id, user.username, user.role as string)
    return { user, ...tokens }
  }

  async validateUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } })
    if (!user) return null
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return null
    return user
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password)
    if (!user) throw new UnauthorizedException({ message: 'Invalid credentials' })
    const tokens = await this.issueTokens(user.id, user.username, user.role)
    return {
      user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role },
      ...tokens,
    }
  }

  private async issueTokens(userId: string, username: string, role: string) {
    const jti = uuidv4()
    const payload: JwtPayload = { sub: userId, username, role, jti }

    const accessToken = await this.jwt.signAsync(payload, {
      secret: ACCESS_SECRET,
      expiresIn: ACCESS_EXPIRES,
    })
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: REFRESH_SECRET,
      expiresIn: REFRESH_EXPIRES,
    })

    // Store refresh jti in Redis (whitelist) with TTL equal to token lifetime
    const ttlSec = await this.parseTtlSeconds(REFRESH_EXPIRES)
    await this.redis.set(this.refreshKey(userId, jti), '1', 'EX', ttlSec)

    return { accessToken, refreshToken, expiresIn: ACCESS_EXPIRES }
  }

  private refreshKey(userId: string, jti: string) {
    return `kukutalk:refresh:${userId}:${jti}`
  }

  private async parseTtlSeconds(exp: string): Promise<number> {
    // Supports "15m", "7d", "3600" (seconds)
    if (/^\d+$/.test(exp)) return parseInt(exp, 10)
    const m = exp.match(/^(\d+)([smhd])$/)
    if (!m) return 60 * 60 * 24 * 7
    const n = parseInt(m[1], 10)
    const unit = m[2]
    switch (unit) {
      case 's': return n
      case 'm': return n * 60
      case 'h': return n * 3600
      case 'd': return n * 86400
      default: return 604800
    }
  }

  async refresh(refreshToken: string) {
    try {
      const decoded = await this.jwt.verifyAsync<JwtPayload>(refreshToken, { secret: REFRESH_SECRET })
      const exists = await this.redis.get(this.refreshKey(decoded.sub, decoded.jti))
      if (!exists) throw new UnauthorizedException({ message: 'Refresh token revoked' })
      // Rotate refresh token (new jti)
      const tokens = await this.issueTokens(decoded.sub, decoded.username, decoded.role)
      // Revoke old jti
      await this.redis.del(this.refreshKey(decoded.sub, decoded.jti))
      return tokens
    } catch (e) {
      throw new UnauthorizedException({ message: 'Invalid refresh token' })
    }
  }

  async logout(refreshToken: string) {
    try {
      const decoded = await this.jwt.verifyAsync<JwtPayload>(refreshToken, { secret: REFRESH_SECRET })
      await this.redis.del(this.refreshKey(decoded.sub, decoded.jti))
    } catch {
      // ignore
    }
  }
}


