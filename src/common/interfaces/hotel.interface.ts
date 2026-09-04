/**
 * Raw supplier offer contract returned by mock supplier APIs.
 */
export interface SupplierHotel {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
}

/**
 * Deduplicated, customer-facing hotel offer representation.
 */
export interface DeduplicatedHotel {
  name: string;
  price: number;
  supplier: string;
  commissionPct: number;
}

/**
 * Metadata for tracking workflow execution outcomes.
 */
export interface AggregationResult {
  city: string;
  totalFound: number;
  suppliersQueried: string[];
  failedSuppliers: string[];
  hotels: DeduplicatedHotel[];
}
