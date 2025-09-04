import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { ParentService } from './parent.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../shared/roles.decorator'
import { RolesGuard } from '../shared/roles.guard'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parent')
export class ParentController {
  constructor(private readonly parent: ParentService) {}

  @Roles('PARENT')
  @Get('summary')
  summary(@Req() req: any) {
    return this.parent.summary(req.user.userId)
  }

  @Roles('PARENT')
  @Get('alerts')
  alerts(@Req() req: any) {
    return this.parent.alerts(req.user.userId)
  }
}
