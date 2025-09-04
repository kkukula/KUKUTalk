import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../shared/roles.decorator'
import { RolesGuard } from '../shared/roles.guard'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles('ADMIN', 'TEACHER')
  @Get()
  async list(@Query('skip') skip?: string, @Query('take') take?: string) {
    const s = Number(skip) || 0
    const t = Number(take) || 20
    return this.users.findMany(s, t)
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Req() req: any) {
    const me = req.user?.userId
    const role = req.user?.role
    if (me !== id && role !== 'ADMIN' && role !== 'TEACHER') {
      // mimic Forbidden without importing exception to keep file small
      return { error: 'Forbidden' }
    }
    return this.users.findById(id)
  }
}
