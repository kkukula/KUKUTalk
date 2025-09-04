import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { JwtAccessStrategy } from './jwt-access.strategy'
import { JwtRefreshStrategy } from './jwt-refresh.strategy'
import { UsersModule } from '../users/users.module'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    UsersModule,
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
