import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@Req() req: any) {
    return this.users.me(req.user.userId)
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.users.findById(id)
  }
}
