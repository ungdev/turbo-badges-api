import { Controller, Get, Header, HttpCode, Redirect } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AppService } from 'src/app.service';

@ApiExcludeController()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @Redirect('/docs', 302)
  @ApiOperation({ summary: 'Redirect to API documentation' })
  redirectToApi() {
    return;
  }

  @Get('ping')
  @HttpCode(200)
  @Header('API-Version', '0.0.1')
  @ApiTags('Monitoring')
  @ApiOperation({ summary: 'Simple health ping endpoint' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  ping(): { status: string; timestamp: string } {
    return this.appService.ping();
  }

  @Get('health')
  @HttpCode(200)
  @Header('API-Version', '0.0.1')
  @ApiTags('Monitoring')
  @ApiOperation({ summary: 'Detailed health check with dependencies status' })
  @ApiResponse({
    status: 200,
    description: 'Health check successful',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-02-05T10:30:00.000Z',
        uptime: 12345,
        dependencies: {
          database: 'healthy',
        },
      },
    },
  })
  @ApiResponse({ status: 503, description: 'Service unhealthy' })
  async health(): Promise<unknown> {
    return this.appService.healthCheck();
  }
}
