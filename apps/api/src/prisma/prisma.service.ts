import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  enableShutdownHooks(app: INestApplication) {
    // Workaround for some TS setups that see the 'beforeExit' event as 'never'
    (this.$on as any)('beforeExit', async () => {
      await app.close();
    });
  }
}
