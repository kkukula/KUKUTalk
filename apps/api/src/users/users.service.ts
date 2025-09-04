import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, username: true, displayName: true, role: true,
        createdAt: true, updatedAt: true,
      },
    })
  }

  me(userId: string) {
    return this.findById(userId)
  }
}


