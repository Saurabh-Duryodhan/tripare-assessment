import { deduplicateOffers } from './workflows';
import { SupplierHotel } from '../common/interfaces/hotel.interface';

describe('Workflow Deduplication Logic (deduplicateOffers)', () => {
  it('should select cheaper offer when hotel appears in both suppliers', () => {
    const listA: SupplierHotel[] = [
      { hotelId: 'a1', name: 'Holtin', price: 6000, city: 'delhi', commissionPct: 10 },
      { hotelId: 'a2', name: 'Radison', price: 5900, city: 'delhi', commissionPct: 13 },
    ];

    const listB: SupplierHotel[] = [
      { hotelId: 'b1', name: 'Holtin', price: 5340, city: 'delhi', commissionPct: 20 },
      { hotelId: 'b2', name: 'Radison', price: 6400, city: 'delhi', commissionPct: 15 },
    ];

    const result = deduplicateOffers(listA, listB);

    expect(result).toHaveLength(2);

    const holtin = result.find((h) => h.name === 'Holtin');
    expect(holtin).toBeDefined();
    expect(holtin?.price).toBe(5340);
    expect(holtin?.supplier).toBe('Supplier B');
    expect(holtin?.commissionPct).toBe(20);

    const radison = result.find((h) => h.name === 'Radison');
    expect(radison).toBeDefined();
    expect(radison?.price).toBe(5900);
    expect(radison?.supplier).toBe('Supplier A');
    expect(radison?.commissionPct).toBe(13);
  });

  it('should include hotel when only one supplier returns it', () => {
    const listA: SupplierHotel[] = [
      { hotelId: 'a1', name: 'The Imperial', price: 9200, city: 'delhi', commissionPct: 18 },
    ];

    const listB: SupplierHotel[] = [
      { hotelId: 'b1', name: 'Hyatt Regency', price: 4800, city: 'delhi', commissionPct: 14 },
    ];

    const result = deduplicateOffers(listA, listB);

    expect(result).toHaveLength(2);
    expect(result.some((h) => h.name === 'The Imperial' && h.supplier === 'Supplier A')).toBe(true);
    expect(result.some((h) => h.name === 'Hyatt Regency' && h.supplier === 'Supplier B')).toBe(true);
  });

  it('should handle case insensitivity and whitespace gracefully', () => {
    const listA: SupplierHotel[] = [
      { hotelId: 'a1', name: '  Grand Hyatt  ', price: 8000, city: 'delhi', commissionPct: 10 },
    ];

    const listB: SupplierHotel[] = [
      { hotelId: 'b1', name: 'grand hyatt', price: 7500, city: 'delhi', commissionPct: 12 },
    ];

    const result = deduplicateOffers(listA, listB);

    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(7500);
    expect(result[0].supplier).toBe('Supplier B');
  });

  it('should return empty list when both supplier results are empty', () => {
    const result = deduplicateOffers([], []);
    expect(result).toEqual([]);
  });

  it('should sort results ascending by price', () => {
    const listA: SupplierHotel[] = [
      { hotelId: 'a1', name: 'Budget Inn', price: 2000, city: 'delhi', commissionPct: 5 },
      { hotelId: 'a2', name: 'Luxury Palace', price: 15000, city: 'delhi', commissionPct: 25 },
    ];
    const listB: SupplierHotel[] = [
      { hotelId: 'b1', name: 'Comfort Stay', price: 4500, city: 'delhi', commissionPct: 10 },
    ];

    const result = deduplicateOffers(listA, listB);
    expect(result.map((r) => r.price)).toEqual([2000, 4500, 15000]);
  });
});
