import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, Client, WorkflowExecutionAlreadyStartedError } from '@temporalio/client';
import { DeduplicatedHotel } from '../common/interfaces/hotel.interface';
import { aggregateHotelsWorkflow, deduplicateOffers } from './workflows';
import { SuppliersService } from '../modules/suppliers/suppliers.service';
import { RedisService } from '../modules/redis/redis.service';
import { AuditService } from '../modules/database/audit.service';

@Injectable()
export class TemporalClientService implements OnModuleInit {
  private readonly logger = new Logger(TemporalClientService.name);
  private client: Client | null = null;
  private isConnected = false;
  private readonly taskQueue: string;
  private readonly address: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly suppliersService: SuppliersService,
    private readonly redisService: RedisService,
    private readonly auditService: AuditService,
  ) {
    this.address = this.configService.get<string>('temporal.address', 'localhost:7233');
    this.taskQueue = this.configService.get<string>('temporal.taskQueue', 'hotel-orchestrator-queue');
  }

  async onModuleInit() {
    await this.initClient();
  }

  async initClient(): Promise<boolean> {
    try {
      const connection = await Connection.connect({ address: this.address });
      this.client = new Client({ connection });
      this.isConnected = true;
      this.logger.log(`Connected to Temporal Server at ${this.address}`);
      return true;
    } catch (err) {
      this.isConnected = false;
      this.logger.warn(`Could not connect to Temporal Server at ${this.address}: ${err.message}. Local workflow runner ready as backup.`);
      return false;
    }
  }

  /**
   * Executes hotel aggregation via Temporal Workflow.
   * If Temporal Server is reachable, executes distributed workflow.
   * If Temporal Server is not reachable in local dev/testing without Docker,
   * runs the deterministic workflow logic with identical behavior.
   */
  async executeHotelAggregation(city: string): Promise<DeduplicatedHotel[]> {
    const workflowId = `hotel-agg-${city.toLowerCase()}-${Date.now()}`;

    if (this.isConnected && this.client) {
      try {
        this.logger.log(`Triggering Temporal Workflow [${workflowId}] on taskQueue '${this.taskQueue}'`);
        const handle = await this.client.workflow.start(aggregateHotelsWorkflow, {
          args: [city],
          taskQueue: this.taskQueue,
          workflowId,
        });

        return await handle.result();
      } catch (err) {
        this.logger.error(`Temporal workflow failed: ${err.message}. Invoking local fallback orchestrator.`);
      }
    }

    // Direct orchestrator fallback (when Temporal daemon is unavailable)
    return this.executeLocalFallback(city);
  }

  /**
   * Fallback orchestrator replicating workflow behavior directly:
   * 1. Calls suppliers in parallel
   * 2. Deduplicates & picks best offer
   * 3. Saves to Redis Sorted Set and PostgreSQL
   */
  async executeLocalFallback(city: string): Promise<DeduplicatedHotel[]> {
    this.logger.log(`Executing in-process orchestration for city: ${city}`);
    const [resultA, resultB] = await Promise.allSettled([
      Promise.resolve(this.suppliersService.getSupplierAHotels(city)),
      Promise.resolve(this.suppliersService.getSupplierBHotels(city)),
    ]);

    const hotelsA = resultA.status === 'fulfilled' ? resultA.value : [];
    const hotelsB = resultB.status === 'fulfilled' ? resultB.value : [];

    if (resultA.status === 'rejected' && resultB.status === 'rejected') {
      throw new Error(`Both suppliers failed for city '${city}'`);
    }

    const deduplicated = deduplicateOffers(hotelsA, hotelsB);

    // Save to Redis Sorted Set and Postgres audit
    await this.redisService.saveHotelsZSet(city, deduplicated);
    await this.auditService.syncBestOffers(city, deduplicated);

    return deduplicated;
  }

  getHealth(): { status: string; address: string } {
    return {
      status: this.isConnected ? 'UP' : 'STANDALONE_FALLBACK',
      address: this.address,
    };
  }
}
