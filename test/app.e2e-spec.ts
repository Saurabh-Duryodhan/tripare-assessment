import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SuppliersModule } from '../src/modules/suppliers/suppliers.module';

describe('Suppliers API (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SuppliersModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/supplierA/hotels (GET)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/supplierA/hotels?city=delhi',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body.some((h: any) => h.name === 'Holtin')).toBe(true);
  });

  it('/supplierB/hotels (GET)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/supplierB/hotels?city=delhi',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body.some((h: any) => h.name === 'Holtin')).toBe(true);
  });

  it('/supplierA/hotels?fail=true should return 503', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/supplierA/hotels?fail=true',
    });

    expect(response.statusCode).toBe(503);
  });
});
