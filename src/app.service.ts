import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  dependencies: {
    database: 'healthy' | 'unhealthy';
  };
}

@Injectable()
export class AppService {
  private readonly startTime: number;

  constructor(private prisma: PrismaService) {
    this.startTime = Date.now();
  }

  ping(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    let databaseStatus: 'healthy' | 'unhealthy' = 'healthy';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      databaseStatus = 'unhealthy';
    }

    const response: HealthCheckResponse = {
      status: databaseStatus === 'healthy' ? 'ok' : 'degraded',
      timestamp,
      uptime,
      dependencies: {
        database: databaseStatus,
      },
    };

    if (databaseStatus === 'unhealthy') {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }
}
