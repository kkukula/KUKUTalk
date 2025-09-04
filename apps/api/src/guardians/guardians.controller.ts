import { Body, Controller, Get, Param, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common'
import { GuardiansService } from './guardians.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../shared/roles.decorator'
import { RolesGuard } from '../shared/roles.guard'
import { RequestedBy } from '@prisma/client'

class RequestLinkDto {
  childId!: string
  parentId!: string
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('guardians')
export class GuardiansController {
  constructor(private readonly guardians: GuardiansService) {}

  @Roles('CHILD', 'PARENT')
  @Post('link')
  async requestLink(@Body() dto: RequestLinkDto, @Req() req: any) {
    const role = req.user?.role
    const userId = req.user?.userId as string
    if (role === 'CHILD' && dto.childId !== userId) {
      throw new ForbiddenException({ message: 'Child can only request a link for themselves' })
    }
    if (role === 'PARENT' && dto.parentId !== userId) {
      throw new ForbiddenException({ message: 'Parent can only request links to themselves' })
    }
    const requestedBy = role === 'PARENT' ? RequestedBy.PARENT : RequestedBy.CHILD
    return this.guardians.requestLink(dto.childId, dto.parentId, requestedBy)
  }

  @Roles('PARENT')
  @Post('link/:id/approve')
  async approve(@Param('id') id: string, @Req() req: any) {
    return this.guardians.approveLink(id, req.user.userId)
  }

  @Roles('PARENT')
  @Post('link/:id/reject')
  async reject(@Param('id') id: string, @Req() req: any) {
    return this.guardians.rejectLink(id, req.user.userId)
  }

  @Get('my')
  async myLinks(@Req() req: any) {
    return this.guardians.listForUser(req.user.userId)
  }
}
