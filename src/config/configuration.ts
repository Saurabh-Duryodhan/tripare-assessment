export const configuration = () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    ttlSeconds: parseInt(process.env.REDIS_TTL_SECONDS, 10) || 300,
  },
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'tripare_hotels',
    synchronize: process.env.POSTGRES_SYNCHRONIZE === 'true' || true,
  },
  temporal: {
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'hotel-orchestrator-queue',
  },
  suppliers: {
    supplierAUrl: process.env.SUPPLIER_A_URL || 'http://localhost:3000/supplierA/hotels',
    supplierBUrl: process.env.SUPPLIER_B_URL || 'http://localhost:3000/supplierB/hotels',
  },
});
