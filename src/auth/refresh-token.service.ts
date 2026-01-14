import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { User } from 'src/users/user.model';

type RedisClient = any;

interface StoredRefresh {
    user: User;
    exp: number;
}

@Injectable()
export class RefreshTokenService implements OnModuleDestroy {
    private readonly logger = new Logger(RefreshTokenService.name);
    private redis: RedisClient | null = null;
    private memory = new Map<string, StoredRefresh>();

    constructor() {
        const url = process.env.REDIS_URL;
        if (url) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const IORedis = require('ioredis');
                this.redis = new IORedis(url);
                this.logger.log('Refresh tokens using Redis backend');
            } catch (e) {
                this.logger.warn('ioredis not installed, falling back to in-memory refresh tokens');
            }
        }
    }

    private key(token: string) {
        return `refresh:${token}`;
    }

    private ttlSeconds(): number {
        const days = Number(process.env.REFRESH_TTL_DAYS || 7);
        return Math.max(1, days) * 24 * 3600;
    }

    async issue(user: User): Promise<{ token: string; exp: number }> {
        const token = randomUUID();
        const now = Math.floor(Date.now() / 1000);
        const exp = now + this.ttlSeconds();
        const data: StoredRefresh = { user, exp };
        if (this.redis) {
            await this.redis.setex(this.key(token), exp - now, JSON.stringify(data));
        } else {
            this.memory.set(token, data);
            this.cleanup();
        }
        return { token, exp };
    }

    async rotate(oldToken: string): Promise<{ token: string; exp: number; user: User } | null> {
        const stored = await this.get(oldToken);
        if (!stored) return null;
        await this.revoke(oldToken);
        const { token, exp } = await this.issue(stored.user);
        return { token, exp, user: stored.user };
    }

    async revoke(token: string): Promise<void> {
        if (this.redis) {
            await this.redis.del(this.key(token));
        } else {
            this.memory.delete(token);
        }
    }

    private async get(token: string): Promise<StoredRefresh | null> {
        if (this.redis) {
            const raw = await this.redis.get(this.key(token));
            return raw ? (JSON.parse(raw) as StoredRefresh) : null;
        } else {
            const val = this.memory.get(token) || null;
            if (!val) return null;
            const now = Math.floor(Date.now() / 1000);
            if (val.exp <= now) {
                this.memory.delete(token);
                return null;
            }
            return val;
        }
    }

    private cleanup() {
        const now = Math.floor(Date.now() / 1000);
        for (const [t, v] of this.memory) {
            if (v.exp <= now) this.memory.delete(t);
        }
    }

    async onModuleDestroy() {
        if (this.redis) {
            try {
                await this.redis.quit();
            } catch { }
        }
    }
}
