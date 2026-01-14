import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    constructor() {
        const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
        super({ adapter, log: ['info', 'warn', 'error'] });
    }

    async onModuleInit() {
        await this.$connect();
        await this.$queryRaw`SELECT 1`;
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}