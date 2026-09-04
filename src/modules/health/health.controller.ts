import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('System Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'System health check including mock suppliers and infrastructure',
    description: 'Informs about the operational health of Supplier A, Supplier B, Redis, Postgres, and Temporal.',
  })
  @ApiResponse({ status: 200, description: 'Current health status breakdown' })
  async check() {
    return this.healthService.getHealthStatus();
  }
}
