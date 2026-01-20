import type { Role } from 'src/users/user.model';

export type RedisClient = any;

export interface StoredRefresh {
    userId: string;
    role: Role;
    exp: number;
}