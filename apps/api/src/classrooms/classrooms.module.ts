import { Module } from '@nestjs/common'
import { ClassroomsService } from './classrooms.service'
import { ClassroomsController } from './classrooms.controller'

@Module({
  providers: [ClassroomsService],
  controllers: [ClassroomsController],
  exports: [ClassroomsService],
})
export class ClassroomsModule {}
