import { Injectable } from '@nestjs/common';
import { SuppliersService } from '../suppliers/suppliers.service';
import { RedisService } from '../redis/redis.service';
import { AuditService } from '../database/audit.service';
import { TemporalClientService } from '../../temporal/client.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly redisService: RedisService,
    private readonly auditService: AuditService,
    private readonly temporalService: TemporalClientService,
  ) {}

  async getHealthStatus() {
    const redisOk = await this.redisService.ping();
    const postgresOk = await this.auditService.checkHealth();
    const suppliersHealth = this.suppliersService.checkHealth();
    const temporalHealth = this.temporalService.getHealth();

    const isHealthy =
      redisOk &&
      suppliersHealth.supplierA.status === 'UP' &&
      suppliersHealth.supplierB.status === 'UP';

    return {
      status: isHealthy ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      dependencies: {
        redis: { status: redisOk ? 'UP' : 'DOWN' },
        postgres: { status: postgresOk ? 'UP' : 'DOWN' },
        supplierA: suppliersHealth.supplierA,
        supplierB: suppliersHealth.supplierB,
        temporal: temporalHealth,
      },
    };
  }
}
