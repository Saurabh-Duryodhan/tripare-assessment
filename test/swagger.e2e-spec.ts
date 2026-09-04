import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HotelsController } from '../src/modules/hotels/hotels.controller';
import { HotelsService } from '../src/modules/hotels/hotels.service';
import { SuppliersController } from '../src/modules/suppliers/suppliers.controller';
import { SuppliersService } from '../src/modules/suppliers/suppliers.service';
import { HealthController } from '../src/modules/health/health.controller';
import { HealthService } from '../src/modules/health/health.service';

describe('Swagger Documentation (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const mockHotelsService = {
      searchHotels: jest.fn(),
    };
    const mockHealthService = {
      getHealthStatus: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HotelsController, SuppliersController, HealthController],
      providers: [
        { provide: HotelsService, useValue: mockHotelsService },
        { provide: SuppliersService, useClass: SuppliersService },
        { provide: HealthService, useValue: mockHealthService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Tripare.AI - Hotel Offer Orchestrator')
      .setDescription('Aggregates overlapping hotel offers from Supplier A and Supplier B')
      .setVersion('1.0.0')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should serve Swagger json schema at /docs-json', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs-json',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.info.title).toBe('Tripare.AI - Hotel Offer Orchestrator');
    expect(body.paths['/api/hotels']).toBeDefined();
    expect(body.paths['/supplierA/hotels']).toBeDefined();
    expect(body.paths['/supplierB/hotels']).toBeDefined();
    expect(body.paths['/health']).toBeDefined();
  });
});
