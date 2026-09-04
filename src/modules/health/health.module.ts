import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { TemporalModule } from '../../temporal/temporal.module';

@Module({
  imports: [SuppliersModule, TemporalModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
