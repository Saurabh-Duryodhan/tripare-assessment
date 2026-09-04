import { HttpException, HttpStatus } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';

describe('SuppliersService', () => {
  let service: SuppliersService;

  beforeEach(() => {
    service = new SuppliersService();
  });

  it('should return Supplier A hotels filtered by city', () => {
    const delhiHotels = service.getSupplierAHotels('delhi');
    expect(delhiHotels.length).toBeGreaterThan(0);
    expect(delhiHotels.every((h) => h.city === 'delhi')).toBe(true);

    const holtin = delhiHotels.find((h) => h.name === 'Holtin');
    expect(holtin).toBeDefined();
    expect(holtin?.price).toBe(6000);
    expect(holtin?.commissionPct).toBe(10);
  });

  it('should return Supplier B hotels filtered by city', () => {
    const delhiHotels = service.getSupplierBHotels('delhi');
    expect(delhiHotels.length).toBeGreaterThan(0);
    expect(delhiHotels.every((h) => h.city === 'delhi')).toBe(true);

    const holtin = delhiHotels.find((h) => h.name === 'Holtin');
    expect(holtin).toBeDefined();
    expect(holtin?.price).toBe(5340);
    expect(holtin?.commissionPct).toBe(20);
  });

  it('should throw 503 SERVICE_UNAVAILABLE when fail flag is passed', () => {
    expect(() => service.getSupplierAHotels('delhi', true)).toThrow(HttpException);
    try {
      service.getSupplierAHotels('delhi', true);
    } catch (e) {
      expect(e.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    }
  });

  it('should reflect health status accurately when toggled', () => {
    expect(service.checkHealth().supplierA.status).toBe('UP');
    service.setSupplierAFaulty(true);
    expect(service.checkHealth().supplierA.status).toBe('DOWN');
  });

  it('should return empty array for unknown city', () => {
    const results = service.getSupplierAHotels('unknown-city-xyz');
    expect(results).toEqual([]);
  });
});
