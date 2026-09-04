import { proxyActivities, log, ApplicationFailure } from '@temporalio/workflow';
import type { HotelActivities } from './activities';
import { DeduplicatedHotel, SupplierHotel } from '../common/interfaces/hotel.interface';

const { fetchSupplierAHotels, fetchSupplierBHotels, persistDeduplicatedHotels } = proxyActivities<HotelActivities>({
  startToCloseTimeout: '15 seconds',
  retry: {
    initialInterval: '500ms',
    backoffCoefficient: 2,
    maximumInterval: '5 seconds',
    maximumAttempts: 3,
  },
});

/**
 * Deduplicates raw hotel listings by hotel name and selects the best offer.
 * Rules:
 * - Case-insensitive & trimmed name matching.
 * - If both suppliers return the same hotel, select the one with cheaper price.
 * - If only one supplier returns a hotel, select that one.
 */
export function deduplicateOffers(
  supplierAHotels: SupplierHotel[],
  supplierBHotels: SupplierHotel[],
): DeduplicatedHotel[] {
  const map = new Map<string, DeduplicatedHotel>();

  // Process Supplier A offersin 
  for (const hotel of supplierAHotels) {
    if (!hotel.name) continue;
    const key = hotel.name.trim().toLowerCase();
    map.set(key, {
      name: hotel.name.trim(),
      price: hotel.price,
      supplier: 'Supplier A',
      commissionPct: hotel.commissionPct,
    });
  }

  // Process Supplier B offers and compare
  for (const hotel of supplierBHotels) {
    if (!hotel.name) continue;
    const key = hotel.name.trim().toLowerCase();
    const existing = map.get(key);

    if (!existing) {
      // Unique to Supplier B
      map.set(key, {
        name: hotel.name.trim(),
        price: hotel.price,
        supplier: 'Supplier B',
        commissionPct: hotel.commissionPct,
      });
    } else {
      // Appears in both lists: select cheaper offer
      if (hotel.price < existing.price) {
        map.set(key, {
          name: hotel.name.trim(),
          price: hotel.price,
          supplier: 'Supplier B',
          commissionPct: hotel.commissionPct,
        });
      }
      // If equal price or existing is cheaper, existing remains
    }
  }

  // Return list sorted ascending by price
  return Array.from(map.values()).sort((a, b) => a.price - b.price);
}

/**
 * Main Temporal Workflow for hotel aggregation and deduplication.
 */
export async function aggregateHotelsWorkflow(city: string): Promise<DeduplicatedHotel[]> {
  log.info(`[Workflow:aggregateHotelsWorkflow] Starting aggregation for city: ${city}`);

  // 1. Call Supplier A and Supplier B in parallel with error resilience
  const [resultA, resultB] = await Promise.allSettled([
    fetchSupplierAHotels(city),
    fetchSupplierBHotels(city),
  ]);

  let hotelsA: SupplierHotel[] = [];
  let hotelsB: SupplierHotel[] = [];
  let failedCount = 0;

  if (resultA.status === 'fulfilled') {
    hotelsA = resultA.value;
    log.info(`Supplier A returned ${hotelsA.length} hotels for city: ${city}`);
  } else {
    failedCount++;
    log.warn(`Supplier A failed: ${resultA.reason?.message || resultA.reason}`);
  }

  if (resultB.status === 'fulfilled') {
    hotelsB = resultB.value;
    log.info(`Supplier B returned ${hotelsB.length} hotels for city: ${city}`);
  } else {
    failedCount++;
    log.warn(`Supplier B failed: ${resultB.reason?.message || resultB.reason}`);
  }

  // If both suppliers failed, fail the workflow
  if (failedCount === 2) {
    throw ApplicationFailure.nonRetryable(
      `Both hotel suppliers (A and B) failed during aggregation for city: ${city}`,
    );
  }

  // 2. Deduplicate hotels and pick the best offer
  const deduplicated = deduplicateOffers(hotelsA, hotelsB);
  log.info(`Deduplication completed. Total unique best offers: ${deduplicated.length}`);

  // 3. Save deduplicated list to Redis Sorted Set and PostgreSQL
  await persistDeduplicatedHotels(city, deduplicated);

  return deduplicated;
}
