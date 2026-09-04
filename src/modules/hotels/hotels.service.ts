import { Injectable, Logger } from '@nestjs/common';
import { DeduplicatedHotel } from '../../common/interfaces/hotel.interface';
import { RedisService } from '../redis/redis.service';
import { TemporalClientService } from '../../temporal/client.service';
import { AuditService } from '../database/audit.service';
import { HotelQueryDto } from '../../common/dto/hotel-query.dto';

@Injectable()
export class HotelsService {
  private readonly logger = new Logger(HotelsService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly temporalService: TemporalClientService,
    private readonly auditService: AuditService,
  ) {}

  async searchHotels(query: HotelQueryDto): Promise<DeduplicatedHotel[]> {
    const startTime = Date.now();
    const city = query.city.trim().toLowerCase();
    const { minPrice, maxPrice, fresh } = query;

    let dataSource: 'REDIS_CACHE' | 'TEMPORAL_WORKFLOW' = 'REDIS_CACHE';

    // 1. Check if hotels for this city are already cached in Redis Sorted Set
    const hasCache = await this.redisService.hasCityCache(city);

    if (!hasCache || fresh) {
      this.logger.log(`Cache miss or refresh forced for city '${city}'. Triggering Temporal workflow orchestration...`);
      dataSource = 'TEMPORAL_WORKFLOW';

      // Orchestrate parallel supplier fetching & deduplication
      await this.temporalService.executeHotelAggregation(city);
    } else {
      this.logger.log(`Cache hit for city '${city}'. Querying Redis Sorted Set directly with price bounds.`);
    }

    // 2. Perform price filtering directly inside Redis using ZRANGEBYSCORE
    const filteredHotels = await this.redisService.getHotelsByPriceRange(
      city,
      minPrice,
      maxPrice,
    );

    const latencyMs = Date.now() - startTime;

    // 3. Record search audit trail in PostgreSQL (non-blocking)
    this.auditService.recordSearch({
      city,
      minPrice,
      maxPrice,
      resultCount: filteredHotels.length,
      source: dataSource,
      latencyMs,
    });

    return filteredHotels;
  }
}
