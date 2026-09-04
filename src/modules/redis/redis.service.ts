import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DeduplicatedHotel } from '../../common/interfaces/hotel.interface';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly defaultTtl: number;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password');
    this.defaultTtl = this.configService.get<number>('redis.ttlSeconds', 300);

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.warn(`Redis connection retry attempt ${times}`);
          return null; // stop retrying
        }
        return Math.min(times * 200, 1000);
      },
    });

    this.client.on('connect', () => {
      this.logger.log(`Connected to Redis at ${host}:${port}`);
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis error: ${err.message}`);
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
    } catch (err) {
      this.logger.warn(`Redis initial connection failed: ${err.message}. Cache fallback enabled.`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
    } catch {
      // Ignored during shutdown
    }
  }


  // Generates standard cache key for city sorted set.
  private getCityZSetKey(city: string): string {
    return `hotels:${city.trim().toLowerCase()}:zset`;
  }

  // check for city if exists in redis
  async hasCityCache(city: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(this.getCityZSetKey(city));
      return exists === 1;
    } catch (err) {
      this.logger.warn(`Redis exists error: ${err.message}`);
      return false;
    }
  }


  //  Stores deduplicated hotels into Redis Sorted Set (ZSET) where score = price.
  //  This enables native, high-performance in-Redis price range filtering.

  async saveHotelsZSet(city: string, hotels: DeduplicatedHotel[], ttlSeconds?: number): Promise<void> {
    try {
      const key = this.getCityZSetKey(city);
      const ttl = ttlSeconds ?? this.defaultTtl;

      const pipeline = this.client.pipeline();
      // Remove any existing set for this city before refreshing
      pipeline.del(key);

      if (hotels.length > 0) {
        // ZADD arguments: key, [score, member, score, member, ...]
        for (const hotel of hotels) {
          pipeline.zadd(key, hotel.price, JSON.stringify(hotel));
        }
        pipeline.expire(key, ttl);
      } else {
        // For empty results, store a sentinel or empty marker with short TTL
        pipeline.set(`empty:${key}`, '1', 'EX', ttl);
      }

      await pipeline.exec();
      this.logger.log(`Cached ${hotels.length} hotels in Redis ZSET for city: ${city}`);
    } catch (err) {
      this.logger.warn(`Failed to save hotels to Redis ZSET: ${err.message}`);
    }
  }


  // Filters hotels natively inside Redis using ZRANGEBYSCORE.
  // minPrice and maxPrice default to -inf and +inf if omitted.
  async getHotelsByPriceRange(
    city: string,
    minPrice?: number,
    maxPrice?: number,
  ): Promise<DeduplicatedHotel[]> {
    try {
      const key = this.getCityZSetKey(city);
      const min = minPrice !== undefined && minPrice !== null ? minPrice : '-inf';
      const max = maxPrice !== undefined && maxPrice !== null ? maxPrice : '+inf';

      // Execute in-Redis price filtering
      const rawMembers = await this.client.zrangebyscore(key, min, max);

      return rawMembers.map((raw) => JSON.parse(raw) as DeduplicatedHotel);
    } catch (err) {
      this.logger.warn(`Failed to query hotels from Redis: ${err.message}`);
      return [];
    }
  }

  /**
   * Health ping.
   */
  async ping(): Promise<boolean> {
    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }
}
