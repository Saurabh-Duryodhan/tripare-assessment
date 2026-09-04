import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { uuidv7 } from '../../common/utils/uuidv7';
import { SearchAudit } from './entities/search-audit.entity';
import { BestOffer } from './entities/best-offer.entity';
import { DeduplicatedHotel } from '../../common/interfaces/hotel.interface';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(SearchAudit)
    private readonly searchAuditRepo: Repository<SearchAudit>,
    @InjectRepository(BestOffer)
    private readonly bestOfferRepo: Repository<BestOffer>,
  ) {}

  async recordSearch(params: {
    city: string;
    minPrice?: number;
    maxPrice?: number;
    resultCount: number;
    source: 'REDIS_CACHE' | 'TEMPORAL_WORKFLOW';
    latencyMs: number;
  }): Promise<void> {
    try {
      const record = this.searchAuditRepo.create({
        id: uuidv7(),
        city: params.city.toLowerCase(),
        minPrice: params.minPrice ?? null,
        maxPrice: params.maxPrice ?? null,
        resultCount: params.resultCount,
        source: params.source,
        latencyMs: params.latencyMs,
      });
      await this.searchAuditRepo.save(record);
    } catch (err) {
      this.logger.warn(`Failed to record search audit: ${err.message}`);
    }
  }

  async syncBestOffers(city: string, hotels: DeduplicatedHotel[]): Promise<void> {
    try {
      const normalizedCity = city.toLowerCase();
      for (const hotel of hotels) {
        await this.bestOfferRepo.upsert(
          {
            id: uuidv7(),
            city: normalizedCity,
            name: hotel.name,
            price: hotel.price,
            supplier: hotel.supplier,
            commissionPct: hotel.commissionPct,
            updatedAt: new Date(),
          },
          ['city', 'name'],
        );
      }
    } catch (err) {
      this.logger.warn(`Failed to sync best offers to Postgres: ${err.message}`);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.searchAuditRepo.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
