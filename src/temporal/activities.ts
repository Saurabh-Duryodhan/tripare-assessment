import { SupplierHotel, DeduplicatedHotel } from '../common/interfaces/hotel.interface';
import { RedisService } from '../modules/redis/redis.service';
import { AuditService } from '../modules/database/audit.service';
import { SuppliersService } from '../modules/suppliers/suppliers.service';

export interface HotelActivities {
  fetchSupplierAHotels(city: string): Promise<SupplierHotel[]>;
  fetchSupplierBHotels(city: string): Promise<SupplierHotel[]>;
  persistDeduplicatedHotels(city: string, hotels: DeduplicatedHotel[]): Promise<void>;
}

/**
 * Activity implementation factory to allow dependency injection
 * from NestJS into Temporal activities.
 */
export function createHotelActivities(
  suppliersService: SuppliersService,
  redisService: RedisService,
  auditService: AuditService,
  supplierAUrl?: string,
  supplierBUrl?: string,
): HotelActivities {
  return {
    async fetchSupplierAHotels(city: string): Promise<SupplierHotel[]> {
      try {
        // If HTTP endpoint URL is configured and active, fetch via HTTP; fallback to service direct call
        if (supplierAUrl) {
          const url = new URL(supplierAUrl);
          if (city) url.searchParams.set('city', city);
          const response = await fetch(url.toString());
          if (!response.ok) {
            throw new Error(`Supplier A returned status ${response.status}: ${await response.text()}`);
          }
          return (await response.json()) as SupplierHotel[];
        }
        return suppliersService.getSupplierAHotels(city);
      } catch (err) {
        // Log activity-level error
        console.error(`[Activity:fetchSupplierAHotels] Failed for city '${city}': ${err.message}`);
        throw err;
      }
    },

    async fetchSupplierBHotels(city: string): Promise<SupplierHotel[]> {
      try {
        if (supplierBUrl) {
          const url = new URL(supplierBUrl);
          if (city) url.searchParams.set('city', city);
          const response = await fetch(url.toString());
          if (!response.ok) {
            throw new Error(`Supplier B returned status ${response.status}: ${await response.text()}`);
          }
          return (await response.json()) as SupplierHotel[];
        }
        return suppliersService.getSupplierBHotels(city);
      } catch (err) {
        console.error(`[Activity:fetchSupplierBHotels] Failed for city '${city}': ${err.message}`);
        throw err;
      }
    },

    async persistDeduplicatedHotels(city: string, hotels: DeduplicatedHotel[]): Promise<void> {
      try {
        // 1. Save directly into Redis Sorted Set (score = price) for instant in-engine price filtering
        await redisService.saveHotelsZSet(city, hotels);

        // 2. Persist audit snapshot in PostgreSQL (TypeORM)
        await auditService.syncBestOffers(city, hotels);
      } catch (err) {
        console.error(`[Activity:persistDeduplicatedHotels] Persistence error for city '${city}': ${err.message}`);
      }
    },
  };
}
