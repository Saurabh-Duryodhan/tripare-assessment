import { Worker, NativeConnection } from '@temporalio/worker';
import * as dotenv from 'dotenv';
import { createHotelActivities } from './activities';
import { SuppliersService } from '../modules/suppliers/suppliers.service';
import { RedisService } from '../modules/redis/redis.service';
import { ConfigService } from '@nestjs/config';

dotenv.config();

async function runStandaloneWorker() {
  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const taskQueue = process.env.TEMPORAL_TASK_QUEUE || 'hotel-orchestrator-queue';

  console.log(`Starting standalone Temporal worker on ${address}, taskQueue: ${taskQueue}`);

  const connection = await NativeConnection.connect({ address });

  // Standalone instances
  const config = new ConfigService();
  const suppliersService = new SuppliersService();
  const redisService = new RedisService(config);
  await redisService.onModuleInit();

  const mockAuditService: any = {
    syncBestOffers: async () => {},
    recordSearch: async () => {},
  };

  const activities = createHotelActivities(
    suppliersService,
    redisService,
    mockAuditService,
    process.env.SUPPLIER_A_URL,
    process.env.SUPPLIER_B_URL,
  );

  const worker = await Worker.create({
    connection,
    namespace: 'default',
    taskQueue,
    workflowsPath: require.resolve('./workflows'),
    activities,
  });

  console.log('Standalone worker ready and listening for workflows...');
  await worker.run();
}

if (require.main === module) {
  runStandaloneWorker().catch((err) => {
    console.error('Worker failed to start:', err);
    process.exit(1);
  });
}
