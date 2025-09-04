import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../infra/prisma/prisma.service';
import { ModerationDecision, ModerationStatus } from '@prisma/client';

@Injectable()
export class ModerationService {
  // constructor(private readonly prisma: PrismaService) {}
  constructor() {}

  // Stub: zwraca pustą listę, aż do czasu dodania modelu i UX
  async listFlags(_statuses?: ModerationStatus[]) {
    return [];
  }

  // Stub: udajemy sukces (można podpiąć prawdziwe update'y po dodaniu modelu)
  async resolveFlag(
    _id: string,
    _decision: ModerationDecision,
    _decidedByUserId?: string,
  ) {
    return { ok: true };
  }

  async check(text: string): Promise<{ allowed: boolean; reason?: string }> {
    // Tu będzie logika moderacji; na razie zawsze allow
    return { allowed: true };
  }
}
