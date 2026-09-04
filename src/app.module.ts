import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configuration } from './config/configuration';
import { RedisModule } from './modules/redis/redis.module';
import { DatabaseModule } from './modules/database/database.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { TemporalModule } from './temporal/temporal.module';
import { HotelsModule } from './modules/hotels/hotels.module';
import { HealthModule } from './modules/health/health.module';
import { SearchAudit } from './modules/database/entities/search-audit.entity';
import { BestOffer } from './modules/database/entities/best-offer.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        entities: [SearchAudit, BestOffer],
        synchronize: config.get<boolean>('database.synchronize'),
        autoLoadEntities: true,
        retryAttempts: 3,
        retryDelay: 2000,
      }),
    }),
    RedisModule,
    DatabaseModule,
    SuppliersModule,
    TemporalModule,
    HotelsModule,
    HealthModule,
  ],
})
export class AppModule {}
