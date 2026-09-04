import { HotelsService } from './hotels.service';
import { RedisService } from '../redis/redis.service';
import { TemporalClientService } from '../../temporal/client.service';
import { AuditService } from '../database/audit.service';
import { DeduplicatedHotel } from '../../common/interfaces/hotel.interface';

describe('HotelsService', () => {
  let service: HotelsService;
  let redisService: jest.Mocked<RedisService>;
  let temporalService: jest.Mocked<TemporalClientService>;
  let auditService: jest.Mocked<AuditService>;

  const mockHotels: DeduplicatedHotel[] = [
    { name: 'Holtin', price: 5340, supplier: 'Supplier B', commissionPct: 20 },
    { name: 'Radison', price: 5900, supplier: 'Supplier A', commissionPct: 13 },
  ];

  beforeEach(() => {
    redisService = {
      hasCityCache: jest.fn(),
      getHotelsByPriceRange: jest.fn(),
      saveHotelsZSet: jest.fn(),
    } as any;

    temporalService = {
      executeHotelAggregation: jest.fn(),
    } as any;

    auditService = {
      recordSearch: jest.fn(),
      syncBestOffers: jest.fn(),
    } as any;

    service = new HotelsService(redisService, temporalService, auditService);
  });

  it('should serve from Redis cache when cache exists', async () => {
    redisService.hasCityCache.mockResolvedValue(true);
    redisService.getHotelsByPriceRange.mockResolvedValue(mockHotels);

    const result = await service.searchHotels({ city: 'delhi' });

    expect(redisService.hasCityCache).toHaveBeenCalledWith('delhi');
    expect(temporalService.executeHotelAggregation).not.toHaveBeenCalled();
    expect(redisService.getHotelsByPriceRange).toHaveBeenCalledWith('delhi', undefined, undefined);
    expect(result).toEqual(mockHotels);
    expect(auditService.recordSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        city: 'delhi',
        source: 'REDIS_CACHE',
        resultCount: 2,
      }),
    );
  });

  it('should trigger Temporal workflow on cache miss and filter via Redis', async () => {
    redisService.hasCityCache.mockResolvedValue(false);
    temporalService.executeHotelAggregation.mockResolvedValue(mockHotels);
    redisService.getHotelsByPriceRange.mockResolvedValue([mockHotels[0]]);

    const result = await service.searchHotels({ city: 'delhi', minPrice: 5000, maxPrice: 5500 });

    expect(temporalService.executeHotelAggregation).toHaveBeenCalledWith('delhi');
    expect(redisService.getHotelsByPriceRange).toHaveBeenCalledWith('delhi', 5000, 5500);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Holtin');
    expect(auditService.recordSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        city: 'delhi',
        source: 'TEMPORAL_WORKFLOW',
        resultCount: 1,
      }),
    );
  });

  it('should bypass cache when fresh=true', async () => {
    redisService.hasCityCache.mockResolvedValue(true); // cache exists
    temporalService.executeHotelAggregation.mockResolvedValue(mockHotels);
    redisService.getHotelsByPriceRange.mockResolvedValue(mockHotels);

    await service.searchHotels({ city: 'delhi', fresh: true });

    // Despite cache existing, fresh=true forces workflow run
    expect(temporalService.executeHotelAggregation).toHaveBeenCalledWith('delhi');
  });
});
