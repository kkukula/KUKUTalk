import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ModerationService } from './moderation.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../shared/roles.decorator'
import { RolesGuard } from '../shared/roles.guard'
import { ModerationDecision, ModerationStatus } from '@prisma/client'

class ResolveDto {
  decision!: ModerationDecision
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Roles('ADMIN', 'TEACHER')
  @Get('flags')
  list(@Query('status') status?: string) {
    const statuses = status ? (status.split(',') as ModerationStatus[]) : [ModerationStatus.OPEN]
    return this.moderation.listFlags(statuses)
  }

  @Roles('ADMIN', 'TEACHER')
  @Post('flags/:id/resolve')
  resolve(@Param('id') id: string, @Body() dto: ResolveDto, @Req() req: any) {
    return this.moderation.resolveFlag(id, dto.decision, req.user.userId)
  }
}
