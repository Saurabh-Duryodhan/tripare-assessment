# Hotel Offer Orchestrator

Production-grade Hotel Offer Aggregator and Orchestration engine built for **Tripare.AI**.

The system queries multiple mock supplier APIs in parallel, orchestrates resilient comparison workflows using **Temporal.io**, deduplicates overlapping hotels selecting the lowest price, caches offers into **Redis**, and performs high-performance price range filtering natively inside Redis using Sorted Sets (`ZSET`). Query audit trails and best-offer historical records are persisted in **PostgreSQL** via **TypeORM**.

---

## 🏛 Architecture Overview

```
                         +-----------------------------------+
                         |   Client (Postman / Browser / UI) |
                         +-----------------+-----------------+
                                           |
                       GET /api/hotels?city=delhi&minPrice=...
                                           v
                         +-----------------------------------+
                         |      NestJS (Fastify Engine)      |
                         |   - Swagger Docs (/docs)          |
                         |   - Global DTO Validation Pipes   |
                         +-----------------+-----------------+
                                           |
                   +-----------------------+-----------------------+
                   | (Cache Check)                                 | (Cache Miss / fresh=true)
                   v                                               v
        +-----------------------+                     +---------------------------+
        |   Redis Sorted Set    |                     |   Temporal Workflow       |
        |  (ZSET price index)   |                     |   (aggregateHotelsWorkflow)
        +-----------+-----------+                     +-------------+-------------+
                    |                                               |
                    |                                  +------------+------------+
                    |                                  |                         |
                    |                                  v                         v
                    |                       +--------------------+     +--------------------+
                    |                       | SupplierA Activity |     | SupplierB Activity |
                    |                       +---------+----------+     +---------+----------+
                    |                                 |                         |
                    |                                 v                         v
                    |                       GET /supplierA/hotels     GET /supplierB/hotels
                    |                                 \                         /
                    |                                  \                       /
                    |                               Deduplication & Lowest Price Pick
                    |                                               |
                    |                                  +------------+------------+
                    |                                  |                         |
                    |                                  v                         v
                    |                       +--------------------+     +--------------------+
                    |<----------------------|  Redis ZSET Store  |     | PostgreSQL Audit   |
                    |  (Stored via Activity)|  (score = price)   |     | (TypeORM Entity)   |
                    |                       +--------------------+     +--------------------+
                    v
    Native In-Redis Price Filtering
    (ZRANGEBYSCORE min max)
                    |
                    v
        Final Deduplicated JSON Response
```

---

## 🛠 Tech Stack

- **Runtime & Framework**: Node.js (TypeScript), NestJS v10 with **Fastify** adapter for maximum throughput.
- **Workflow Orchestration**: **Temporal.io** (`@temporalio/client`, `@temporalio/workflow`, `@temporalio/worker`, `@temporalio/activity`).
- **Caching & Filtering**: **Redis** (native Sorted Sets with `ZRANGEBYSCORE` for sub-millisecond price filtering).
- **Database & ORM**: **PostgreSQL** with **TypeORM** (audit logging for search latency, filters, and historical offer snapshots).
- **API Documentation**: **OpenAPI / Swagger** (`/docs` and `/docs-json`).
- **Testing**: Jest unit and e2e integration suites.
- **Containerization**: Multi-stage **Dockerfile** and **docker-compose.yml**.

---

## 🚀 Getting Started

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/)
- Alternatively for local dev: Node.js (>= 20), Redis, and PostgreSQL

---

### Option 1: Run with Docker Compose (Recommended)

Spins up the NestJS Fastify application, Redis, PostgreSQL, Temporal Server, and Temporal Web UI:

```bash
docker compose up --build
```

Services exposed:
- **NestJS Application**: [http://localhost:3000](http://localhost:3000)
- **Swagger Documentation**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **Temporal Web UI**: [http://localhost:8080](http://localhost:8080)
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

---

### Option 2: Local Development Setup

1. **Clone repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Run unit and integration tests**:
   ```bash
   npm test
   npm run test:e2e
   ```

4. **Build and start the application**:
   ```bash
   npm run build
   npm run start:dev
   ```

---

## 📡 API Endpoints

### 1. Orchestrated Hotel Search
`GET /api/hotels?city=delhi`

Returns deduplicated hotel offers. For overlapping hotels returned by both Supplier A and B, the cheaper offer is selected.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `city` | string | **Yes** | City name (e.g. `delhi`, `mumbai`) |
| `minPrice` | number | No | Minimum price filter (applied inside Redis) |
| `maxPrice` | number | No | Maximum price filter (applied inside Redis) |
| `fresh` | boolean | No | Force cache bypass & re-trigger Temporal workflow |

**Example Response:**
```json
[
  {
    "name": "Holtin",
    "price": 5340,
    "supplier": "Supplier B",
    "commissionPct": 20
  },
  {
    "name": "Radison",
    "price": 5900,
    "supplier": "Supplier A",
    "commissionPct": 13
  },
  {
    "name": "Marriott Aerocity",
    "price": 7200,
    "supplier": "Supplier A",
    "commissionPct": 12
  },
  {
    "name": "Taj Palace",
    "price": 8100,
    "supplier": "Supplier B",
    "commissionPct": 16
  }
]
```

---

### 2. In-Redis Price Filtering
`GET /api/hotels?city=delhi&minPrice=5000&maxPrice=6000`

Filters the aggregated hotel list natively within Redis using `ZRANGEBYSCORE hotels:delhi:zset 5000 6000`.

**Example Response:**
```json
[
  {
    "name": "Holtin",
    "price": 5340,
    "supplier": "Supplier B",
    "commissionPct": 20
  },
  {
    "name": "Radison",
    "price": 5900,
    "supplier": "Supplier A",
    "commissionPct": 13
  }
]
```

---

### 3. Mock Supplier Endpoints
- `GET /supplierA/hotels?city=delhi`
- `GET /supplierB/hotels?city=delhi`

Returns mock hotel listings with deliberate overlaps. Supports `?fail=true` to simulate upstream supplier outages.

---

### 4. Health Check (Bonus Point)
`GET /health`

Informs about the operational health of:
- **Supplier A**
- **Supplier B**
- **Redis**
- **PostgreSQL**
- **Temporal Server**

**Example Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-09-04T09:45:00.000Z",
  "dependencies": {
    "redis": { "status": "UP" },
    "postgres": { "status": "UP" },
    "supplierA": { "status": "UP" },
    "supplierB": { "status": "UP" },
    "temporal": { "status": "UP", "address": "temporal:7233" }
  }
}
```

---

## ⚡ Temporal Workflow Resilience

The aggregation workflow (`aggregateHotelsWorkflow` in `src/temporal/workflows.ts`) provides fault tolerance:

1. **Parallel Activity Execution**: Queries Supplier A and Supplier B concurrently using `Promise.allSettled`.
2. **Partial Outage Degradation**: If Supplier A encounters an error or network timeout, the workflow logs the incident and seamlessly deduplicates based on the remaining healthy supplier (Supplier B).
3. **Automatic Retries & Backoff**: Transient errors are retried with exponential backoff (initial interval: 500ms, backoff coefficient: 2, maximum attempts: 3).
4. **Deterministic Deduplication**:
   - Case-insensitive, trimmed hotel name matching.
   - Lowest price selection for overlaps.
   - Preserves single-supplier listings.

---

## 📮 Postman Collection

A complete Postman collection is included in the root directory: [`postman_collection.json`](./postman_collection.json).

Included test scenarios:
1. **Valid city with expected overlaps**: `GET /api/hotels?city=delhi`
2. **In-Redis Price range filtering**: `GET /api/hotels?city=delhi&minPrice=5000&maxPrice=6000`
3. **City with no results**: `GET /api/hotels?city=nonexistentcity`
4. **Direct Supplier A endpoint**: `GET /supplierA/hotels?city=delhi`
5. **Direct Supplier B endpoint**: `GET /supplierB/hotels?city=delhi`
6. **Simulate supplier outage**: `POST /suppliers/simulate-fault` (`{"supplier": "A", "faulty": true}`)
7. **Orchestration during supplier outage**: `GET /api/hotels?city=delhi&fresh=true`
8. **Restore supplier status**: `POST /suppliers/simulate-fault` (`{"supplier": "A", "faulty": false}`)
9. **Multi-dependency health check**: `GET /health`
10. **Swagger documentation**: `GET /docs`

---

## 🧪 Testing

Run test suites:
```bash
# Unit tests
npm test

# End-to-end integration tests
npm run test:e2e

# Test coverage
npm run test:cov
```

All 20 test cases pass across unit and e2e suites covering deduplication rules, price filtering logic, cache-miss fallback, and supplier fault tolerance.
