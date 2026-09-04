import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Setup Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tripare.AI - Hotel Offer Orchestrator')
    .setDescription(
      'Aggregates overlapping hotel offers from Supplier A and Supplier B, deduplicates by hotel name selecting the cheapest price, and filters by price inside Redis.',
    )
    .setVersion('1.0.0')
    .addTag('Hotels', 'Hotel search, deduplication and price filtering')
    .addTag('Mock Suppliers', 'Mock upstream supplier endpoints (Supplier A & B)')
    .addTag('System Health', 'Dependency health checks (Postgres, Redis, Suppliers, Temporal)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4392;
  await app.listen(port, '0.0.0.0');

  logger.log(`Hotel Offer Orchestrator running on http://localhost:${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
