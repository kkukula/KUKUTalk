import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

// Note: We don't actually use the guard in controller; refreshing is explicit via body.
// Kept for future cookie-based flow or guard-protected endpoint if needed.
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    })
  }
  async validate(payload: any) {
    return { userId: payload.sub, jti: payload.jti }
  }
}
