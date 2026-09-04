import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchAudit } from './entities/search-audit.entity';
import { BestOffer } from './entities/best-offer.entity';
import { AuditService } from './audit.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SearchAudit, BestOffer])],
  providers: [AuditService],
  exports: [AuditService, TypeOrmModule],
})
export class DatabaseModule {}
