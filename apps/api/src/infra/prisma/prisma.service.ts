import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    // Od Prisma 5.x nie używamy this.$on('beforeExit') – w bibliotecznym engine tego eventu nie ma.
    process.on('beforeExit', async () => {
      try {
        await this.$disconnect();
      } catch {
        /* ignore */
      }
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
