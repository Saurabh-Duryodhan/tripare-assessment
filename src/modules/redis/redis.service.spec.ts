import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { DeduplicatedHotel } from '../../common/interfaces/hotel.interface';

describe('RedisService (In-Engine Sorted Set Price Filtering)', () => {
  let redisService: RedisService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn(),
      pipeline: jest.fn(),
      zrangebyscore: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG'),
      on: jest.fn(),
    };

    const mockConfig = {
      get: jest.fn((key: string, defaultVal: any) => {
        if (key === 'redis.ttlSeconds') return 300;
        return defaultVal;
      }),
    } as unknown as ConfigService;

    redisService = new RedisService(mockConfig);
    (redisService as any).client = mockClient;
  });

  it('should save hotels to Redis ZSET with price as score', async () => {
    const pipelineMock = {
      del: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    mockClient.pipeline.mockReturnValue(pipelineMock);

    const hotels: DeduplicatedHotel[] = [
      { name: 'Holtin', price: 5340, supplier: 'Supplier B', commissionPct: 20 },
      { name: 'Radison', price: 5900, supplier: 'Supplier A', commissionPct: 13 },
    ];

    await redisService.saveHotelsZSet('delhi', hotels, 300);

    expect(pipelineMock.del).toHaveBeenCalledWith('hotels:delhi:zset');
    expect(pipelineMock.zadd).toHaveBeenCalledWith(
      'hotels:delhi:zset',
      5340,
      JSON.stringify(hotels[0]),
    );
    expect(pipelineMock.zadd).toHaveBeenCalledWith(
      'hotels:delhi:zset',
      5900,
      JSON.stringify(hotels[1]),
    );
    expect(pipelineMock.expire).toHaveBeenCalledWith('hotels:delhi:zset', 300);
    expect(pipelineMock.exec).toHaveBeenCalled();
  });

  it('should query Redis ZSET with min and max bounds', async () => {
    const hotel1: DeduplicatedHotel = {
      name: 'Holtin',
      price: 5340,
      supplier: 'Supplier B',
      commissionPct: 20,
    };
    mockClient.zrangebyscore.mockResolvedValue([JSON.stringify(hotel1)]);

    const result = await redisService.getHotelsByPriceRange('delhi', 5000, 6000);

    expect(mockClient.zrangebyscore).toHaveBeenCalledWith('hotels:delhi:zset', 5000, 6000);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Holtin');
  });

  it('should use -inf and +inf when bounds are not specified', async () => {
    mockClient.zrangebyscore.mockResolvedValue([]);

    await redisService.getHotelsByPriceRange('delhi');

    expect(mockClient.zrangebyscore).toHaveBeenCalledWith('hotels:delhi:zset', '-inf', '+inf');
  });
});
