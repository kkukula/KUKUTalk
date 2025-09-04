import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } })
  }

  findMany(skip = 0, take = 20) {
    return this.prisma.user.findMany({
      skip,
      take: Math.min(100, Math.max(1, take)),
      orderBy: { createdAt: 'desc' },
      select: { id: true, username: true, displayName: true, role: true, status: true, createdAt: true },
    })
  }
}
