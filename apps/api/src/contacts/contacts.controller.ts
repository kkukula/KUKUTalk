import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ContactsService } from './contacts.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../shared/roles.decorator'
import { RolesGuard } from '../shared/roles.guard'
import { RequestedBy, Role } from '@prisma/client'

class RequestContactDto {
  ownerId!: string
  contactUserId!: string
}

class ApproveContactDto {
  contactId!: string
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Roles('CHILD', 'PARENT')
  @Post('request')
  async request(@Body() dto: RequestContactDto, @Req() req: any) {
    const actingRole = req.user.role as Role
    const actingUserId = req.user.userId as string
    const requestedBy = actingRole === 'PARENT' ? RequestedBy.PARENT : RequestedBy.CHILD
    return this.contacts.requestContact(dto.ownerId, dto.contactUserId, requestedBy, actingUserId, actingRole)
  }

  @Roles('PARENT')
  @Post('approve')
  async approve(@Body() dto: ApproveContactDto, @Req() req: any) {
    return this.contacts.approve(dto.contactId, req.user.userId)
  }

  @Get()
  async list(@Query('childId') childId: string | undefined, @Req() req: any) {
    const actingRole = req.user.role as Role
    const actingUserId = req.user.userId as string
    const id = childId || (actingRole === 'CHILD' ? actingUserId : undefined)
    if (!id) {
      return { error: 'childId is required for non-child roles' }
    }
    return this.contacts.listForChild(id, actingUserId, actingRole)
  }
}
