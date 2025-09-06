import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class PresenceService {
  private readonly log = new Logger(PresenceService.name);
  private readonly redis: Redis;
  private readonly ttlSec: number;
  private readonly typingTtlSec: number;

  constructor() {
    const url = process.env.REDIS_URL ?? 'redis://redis:6379';
    this.ttlSec = Number(process.env.PRESENCE_TTL_SEC ?? 60);
    this.typingTtlSec = Number(process.env.TYPING_TTL_SEC ?? 5);
    this.redis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 2 });
  }

  async heartbeat(userId: string, roomId?: string) {
    if (!userId) return;
    const p = this.redis.pipeline();
    p.set(`presence:user:${userId}`, '1', 'EX', this.ttlSec);
    p.sadd('presence:users', userId);
    p.expire('presence:users', this.ttlSec + 10);
    if (roomId) {
      p.sadd(`presence:room:${roomId}`, userId);
      p.expire(`presence:room:${roomId}`, this.ttlSec + 10);
      p.set(`presence:user:${userId}:room`, roomId, 'EX', this.ttlSec);
    }
    await p.exec();
  }

  async leaveRoom(userId: string, roomId: string) {
    if (!userId || !roomId) return;
    await this.redis.srem(`presence:room:${roomId}`, userId);
  }

  async onlineUsers(): Promise<string[]> {
    const ids = await this.redis.smembers('presence:users');
    if (!ids.length) return [];
    const keys = ids.map(id => `presence:user:${id}`);
    const vals = await this.redis.mget(keys);
    const res: string[] = [];
    ids.forEach((id, i) => { if (vals[i]) res.push(id); });
    return res;
  }

  async roomMembers(roomId: string): Promise<string[]> {
    const ids = await this.redis.smembers(`presence:room:${roomId}`);
    if (!ids.length) return [];
    const keys = ids.map(id => `presence:user:${id}`);
    const vals = await this.redis.mget(keys);
    const res: string[] = [];
    ids.forEach((id, i) => { if (vals[i]) res.push(id); });
    return res;
  }

  async setTyping(roomId: string, userId: string, isTyping: boolean) {
    if (!roomId || !userId) return;
    const key = `presence:typing:${roomId}:${userId}`;
    if (isTyping) await this.redis.set(key, '1', 'EX', this.typingTtlSec);
    else await this.redis.del(key);
  }

  async whoTyping(roomId: string): Promise<string[]> {
    // prosta wersja SCAN; wystarczy na MVP
    const pattern = `presence:typing:${roomId}:*`;
    let cursor = '0';
    const users: string[] = [];
    do {
      // @ts-ignore
      const [next, keys]: [string, string[]] = await (this.redis as any).scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      for (const k of keys) {
        const alive = await this.redis.get(k);
        if (alive) {
          const u = k.substring(k.lastIndexOf(':') + 1);
          users.push(u);
        }
      }
    } while (cursor !== '0');
    return Array.from(new Set(users));
  }
}
