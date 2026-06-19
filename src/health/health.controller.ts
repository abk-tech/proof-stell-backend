import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Readiness check',
    description:
      'Checks whether the application dependencies are ready to serve traffic',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application is unhealthy',
  })
  ready() {
    return this.health.getReadiness();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check',
    description:
      'Checks PostgreSQL, Redis, mail, and blockchain dependencies before accepting traffic',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
  })
  @ApiResponse({
    status: 503,
    description: 'One or more dependencies are unavailable',
  })
  readiness() {
    return this.health.getReadiness();
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness check',
    description: 'Confirms the process is alive and responsive',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
  })
  liveliness() {
    return this.health.getLiveness();
  }
}
