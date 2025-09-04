import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { ClassroomsService } from './classrooms.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../shared/roles.decorator'
import { RolesGuard } from '../shared/roles.guard'
import { ClassRole } from '@prisma/client'

class CreateClassroomDto { name!: string }
class InviteDto { userId!: string; role?: ClassRole }

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classrooms')
export class ClassroomsController {
  constructor(private readonly classrooms: ClassroomsService) {}

  @Roles('TEACHER')
  @Post()
  create(@Body() dto: CreateClassroomDto, @Req() req: any) {
    return this.classrooms.createClassroom(req.user.userId, dto.name)
  }

  @Roles('TEACHER')
  @Post(':id/invite')
  invite(@Param('id') id: string, @Body() dto: InviteDto, @Req() req: any) {
    return this.classrooms.invite(id, req.user.userId, dto.userId, dto.role ?? ClassRole.STUDENT)
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() req: any) {
    return this.classrooms.getClassroom(id, req.user.userId)
  }
}
