import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, NativeConnection } from '@temporalio/worker';
import { createHotelActivities } from './activities';
import { SuppliersService } from '../modules/suppliers/suppliers.service';
import { RedisService } from '../modules/redis/redis.service';
import { AuditService } from '../modules/database/audit.service';
import * as path from 'path';

@Injectable()
export class TemporalWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TemporalWorkerService.name);
  private worker: Worker | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly suppliersService: SuppliersService,
    private readonly redisService: RedisService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    // Only attempt to start worker if TEMPORAL_AUTO_WORKER is not explicitly false
    const shouldStart = this.configService.get<string>('TEMPORAL_AUTO_WORKER', 'true') === 'true';
    if (!shouldStart) return;

    const address = this.configService.get<string>('temporal.address', 'localhost:7233');
    const taskQueue = this.configService.get<string>('temporal.taskQueue', 'hotel-orchestrator-queue');

    try {
      const connection = await NativeConnection.connect({ address });
      const activities = createHotelActivities(
        this.suppliersService,
        this.redisService,
        this.auditService,
        this.configService.get<string>('suppliers.supplierAUrl'),
        this.configService.get<string>('suppliers.supplierBUrl'),
      );

      this.worker = await Worker.create({
        connection,
        namespace: 'default',
        taskQueue,
        workflowsPath: require.resolve('./workflows'),
        activities,
      });

      // Run worker non-blocking in background
      this.worker.run().catch((err) => {
        this.logger.warn(`Temporal worker stopped: ${err.message}`);
      });

      this.logger.log(`Temporal Worker successfully started on taskQueue '${taskQueue}'`);
    } catch (err) {
      this.logger.warn(`Could not start embedded Temporal Worker: ${err.message}.`);
    }
  }

  async onModuleDestroy() {
    if (this.worker) {
      this.worker.shutdown();
    }
  }
}
