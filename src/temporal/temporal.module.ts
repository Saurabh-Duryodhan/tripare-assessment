import { Module } from '@nestjs/common';
import { TemporalClientService } from './client.service';
import { TemporalWorkerService } from './worker.service';
import { SuppliersModule } from '../modules/suppliers/suppliers.module';

@Module({
  imports: [SuppliersModule],
  providers: [TemporalClientService, TemporalWorkerService],
  exports: [TemporalClientService],
})
export class TemporalModule {}
